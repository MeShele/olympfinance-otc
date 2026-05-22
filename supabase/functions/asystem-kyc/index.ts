import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { requireUserAndOperator, createAdminClient } from '../_shared/auth.ts'
import { upsertKycVerification } from '../_shared/kyc-status.ts'
import { formatExternalUserId } from '../_shared/kyc-external-id.ts'
import { KYC_METHOD, KYC_STATUS } from '../_shared/kyc-constants.ts'

/**
 * OTC manual KYC.
 *
 * No risk scoring, no face matching, no sanctions check, no auto-decisions.
 * The client uploads document + selfie + personal data; we persist the
 * row with status='pending' and let the operator approve/reject from
 * `/admin/compliance`. The OTC build intentionally pushes every applicant
 * through a human — automated scoring is sold separately as Comply Core.
 *
 * Actions:
 *   init   — create a pending verification row
 *   verify — store the uploaded document / selfie / OCR fields, status=pending
 *   status — return current verification state
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions()

  try {
    const authRes = await requireUserAndOperator(req)
    if (!authRes.ok) return authRes.response
    const { userId, operatorId } = authRes.ctx

    const admin = createAdminClient()
    const { action, ...params } = await req.json()

    switch (action) {
      case 'init': {
        const { data: existing } = await admin
          .from('kyc_verifications')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()

        if (existing?.status === 'approved') {
          return jsonResponse({ status: 'approved', message: 'Уже верифицирован' })
        }
        if (existing && ['pending', 'in_progress'].includes(existing.status)) {
          return jsonResponse({ status: existing.status, verification_id: existing.id })
        }

        const externalUserId = formatExternalUserId(KYC_METHOD.ASYSTEM, userId)
        const { data: verification, error: createErr } = await admin
          .from('kyc_verifications')
          .upsert({
            user_id: userId,
            operator_id: operatorId,
            status: KYC_STATUS.PENDING,
            external_user_id: externalUserId,
            verification_method: KYC_METHOD.ASYSTEM,
          }, { onConflict: 'user_id' })
          .select()
          .single()

        if (createErr) {
          console.error('Error creating verification:', createErr)
          return jsonResponse({ error: 'Ошибка создания верификации' }, 500)
        }

        return jsonResponse({
          status: 'pending',
          verification_id: verification.id,
        })
      }

      case 'verify': {
        const {
          document_type,
          document_country,
          document_number,
          document_url,
          selfie_url,
          full_name,
          phone,
          date_of_birth,
          liveness_passed,
          ocr_data: clientOcrData,
        } = params

        if (!document_url || !selfie_url) {
          return jsonResponse({ error: 'Фото документа и селфи обязательны' }, 400)
        }
        if (!full_name || !document_number) {
          return jsonResponse({ error: 'ФИО и номер документа обязательны' }, 400)
        }

        const ocrData = clientOcrData || {
          full_name,
          document_number,
          country: document_country,
          date_of_birth,
        }

        // Always queue for human review — no auto decisions in the OTC build.
        await upsertKycVerification({
          userId,
          operatorId,
          method: KYC_METHOD.ASYSTEM,
          status: KYC_STATUS.PENDING,
          applicantId: '',
          externalUserId: formatExternalUserId(KYC_METHOD.ASYSTEM, userId),
          rejectionReason: null,
          extraFields: {
            document_type: document_type || 'PASSPORT',
            document_country: document_country || 'KGZ',
            document_number,
            document_url,
            selfie_url,
            ocr_data: ocrData,
            liveness_passed: !!liveness_passed,
          },
        })

        // upsertKycVerification also syncs profiles.is_verified; persist
        // full_name + phone too since those are KYC-specific.
        await admin
          .from('profiles')
          .update({ full_name, phone: phone || null })
          .eq('user_id', userId)

        return jsonResponse({
          status: KYC_STATUS.PENDING,
          decision: 'manual_review',
          pending_review: true,
        })
      }

      case 'status': {
        const { data: verification } = await admin
          .from('kyc_verifications')
          .select('status, verified_at, rejection_reason, verification_method')
          .eq('user_id', userId)
          .maybeSingle()
        return jsonResponse(verification || { status: null })
      }

      default:
        return jsonResponse({ error: `Неизвестное действие: ${action}` }, 400)
    }
  } catch (err) {
    console.error('OTC KYC error:', err)
    return jsonResponse({ error: 'Внутренняя ошибка сервера' }, 500)
  }
})
