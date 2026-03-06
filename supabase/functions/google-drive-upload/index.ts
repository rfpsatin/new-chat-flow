import {
  corsHeaders,
  createSupabaseClients,
  getCallerContext,
  getGoogleAccessToken,
} from '../_shared/google-drive.ts'

type UploadBody = {
  empresa_id?: string
  file_name: string
  mime_type: string
  content_base64: string
  conversa_id?: string
  mensagem_historico_id?: number
}

async function uploadToGoogleDrive(accessToken: string, folderId: string, body: UploadBody) {
  const metadata = {
    name: body.file_name,
    mimeType: body.mime_type,
    parents: [folderId],
  }

  const boundary = `drive-boundary-${crypto.randomUUID()}`
  const base64Payload = body.content_base64.includes(',')
    ? body.content_base64.split(',').pop() || ''
    : body.content_base64
  const fileBytes = Uint8Array.from(atob(base64Payload), (char) => char.charCodeAt(0))

  const prefix =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${body.mime_type}\r\n\r\n`
  const suffix = `\r\n--${boundary}--`

  const prefixBytes = new TextEncoder().encode(prefix)
  const suffixBytes = new TextEncoder().encode(suffix)
  const payload = new Uint8Array(prefixBytes.length + fileBytes.length + suffixBytes.length)
  payload.set(prefixBytes, 0)
  payload.set(fileBytes, prefixBytes.length)
  payload.set(suffixBytes, prefixBytes.length + fileBytes.length)

  const uploadResp = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: payload,
    }
  )
  const uploadData = await uploadResp.json()
  if (!uploadResp.ok || !uploadData.id) {
    throw new Error(uploadData.error?.message || 'Falha no upload para Google Drive')
  }

  return uploadData as { id: string; name: string; mimeType: string; size?: string }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { admin } = createSupabaseClients(req)
    const caller = await getCallerContext(req)
    const body = (await req.json()) as UploadBody
    if (!body.file_name || !body.mime_type || !body.content_base64) {
      throw new Error('Campos obrigatorios: file_name, mime_type, content_base64')
    }

    const targetEmpresaId = body.empresa_id || caller.empresaId
    if (!targetEmpresaId) {
      throw new Error('Empresa nao identificada')
    }
    if (!caller.isSuperAdmin && targetEmpresaId !== caller.empresaId) {
      throw new Error('Sem permissao para enviar arquivo para outra empresa')
    }

    const { accessToken, driveFolderId } = await getGoogleAccessToken(admin, targetEmpresaId)
    const uploaded = await uploadToGoogleDrive(accessToken, driveFolderId, body)

    let uploaderUserId: string | null = null
    const { data: uploader } = await admin
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', caller.authUserId)
      .maybeSingle()
    if (uploader?.id) uploaderUserId = uploader.id

    const { data: savedFile, error: insertError } = await admin
      .from('empresa_arquivos')
      .insert({
        empresa_id: targetEmpresaId,
        conversa_id: body.conversa_id || null,
        mensagem_historico_id: body.mensagem_historico_id || null,
        drive_file_id: uploaded.id,
        drive_folder_id: driveFolderId,
        nome: uploaded.name || body.file_name,
        mime_type: uploaded.mimeType || body.mime_type,
        size_bytes: Number(uploaded.size || 0),
        uploaded_by_user_id: uploaderUserId,
      })
      .select('*')
      .single()

    if (insertError) throw new Error(insertError.message)

    return new Response(
      JSON.stringify({
        success: true,
        arquivo: savedFile,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

