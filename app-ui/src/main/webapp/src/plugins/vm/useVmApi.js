import { useApi } from '@/composables/useApi.js'

const BASE = 'rest/service/vm'

export function useVmApi() {
  const { get, post, put, del } = useApi()

  return {
    getStatus: (subscriptionId) => get(`${BASE}/${subscriptionId}`),
    execute: (subscriptionId, operation) => post(`${BASE}/${subscriptionId}/execution/${operation}`),
    getSchedules: (subscriptionId) => get(`${BASE}/${subscriptionId}/schedule`),
    saveSchedule: (data) => post(`${BASE}/schedule`, data),
    updateSchedule: (data) => put(`${BASE}/schedule`, data),
    deleteSchedule: (id) => del(`${BASE}/schedule/${id}`),
    getSnapshots: (subscriptionId) => get(`${BASE}/${subscriptionId}/snapshot`),
    createSnapshot: (subscriptionId) => post(`${BASE}/${subscriptionId}/snapshot`),
    deleteSnapshot: (subscriptionId, snapshotId) => del(`${BASE}/${subscriptionId}/snapshot/${snapshotId}`),
  }
}
