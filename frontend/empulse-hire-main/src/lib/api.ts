const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
    ...opts,
  })
  if (res.status === 401) throw new Error('Unauthorized')
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as any).error ?? res.statusText)
  }
  return res.json()
}

// ── Normalise interview rows returned by the backend ──────────────────────────
// Backend uses camelCase Mongoose fields; frontend UI expects snake_case.
export function normalizeInterview(i: any) {
  const cand = i.candidateId ?? {}
  const panel = i.panelistId ?? {}
  return {
    id: i._id ?? i.id,
    candidate_id: cand._id ?? i.candidateId,
    panelist_id: panel._id ?? i.panelistId,
    scheduled_date: i.scheduledAt ? String(i.scheduledAt).slice(0, 10) : null,
    slot_time: i.interviewSlot ?? null,
    status: (i.status ?? 'scheduled').toLowerCase().replace(/ /g, '_'),
    result: i.selected === true ? 'selected' : i.selected === false ? 'rejected' : 'pending',
    round_number: 1,
    feedback_url: null,
    created_at: i.createdAt ?? null,
    resolved_at: null,
    cancellation_reason: null,
    candidates: cand.name
      ? { name: cand.name, level_code: cand.levelCode ?? 'E1', role_applied: cand.roleApplied ?? null }
      : null,
    panelists: panel.name
      ? { name: panel.name, emp_id: panel.empId ?? null, level_code: null }
      : null,
  }
}

export function normalizeHR(u: any) {
  return {
    id: u._id ?? u.id,
    name: u.name,
    email: u.email,
    designation: u.designation ?? null,
    level_code: null,
    is_active: u.isActive ?? true,
    user_id: null,
    added_on: u.createdAt ?? u.added_on ?? null,
  }
}
