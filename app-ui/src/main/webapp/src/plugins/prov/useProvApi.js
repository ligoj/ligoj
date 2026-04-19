import { useApi } from '@/composables/useApi.js'

const BASE = 'rest/service/prov'

export function useProvApi() {
  const { get, post, put, del } = useApi()

  return {
    // Quote
    getQuote: (sub) => get(`${BASE}/${sub}`),
    refreshQuote: (sub) => get(`${BASE}/${sub}/refresh`),

    // Resources (instance, database, container, function, storage, support)
    getResources: (sub, type) => get(`${BASE}/${sub}/${type}`),
    createResource: (sub, type, data) => post(`${BASE}/${sub}/${type}`, data),
    updateResource: (sub, type, id, data) => put(`${BASE}/${sub}/${type}/${id}`, data),
    deleteResource: (sub, type, id) => del(`${BASE}/${sub}/${type}/${id}`),

    // Lookup (price, instance types)
    lookup: (sub, type, criteria) => get(`${BASE}/${sub}/${type}/lookup`, { params: criteria }),

    // Tags
    getTags: (sub, type, id) => get(`${BASE}/${sub}/${type}/${id}/tag`),
    setTags: (sub, type, id, tags) => put(`${BASE}/${sub}/${type}/${id}/tag`, tags),

    // CSV Import
    uploadCsv: (sub, formData) => post(`${BASE}/${sub}/upload`, formData),

    // Network
    getNetwork: (sub, type, id) => get(`${BASE}/${sub}/network/${type}/${id}`),
    saveNetwork: (sub, type, id, links) => put(`${BASE}/${sub}/network/${type}/${id}`, links),

    // Terraform
    getTerraformStatus: (sub) => get(`${BASE}/${sub}/terraform`),
    executeTerraform: (sub, action) => post(`${BASE}/${sub}/terraform/${action}`),
    getTerraformLog: (sub) => get(`${BASE}/${sub}/terraform.log`),
    checkTerraformInstall: () => get(`${BASE}/terraform/install`),
    installTerraform: (version) => post(`${BASE}/terraform/version/${version}`),

    // Catalog
    getCatalogs: () => get(`${BASE}/catalog`),
    updateCatalog: (data) => put(`${BASE}/catalog`, data),
    importCatalog: (node) => post(`${BASE}/catalog/${node}/import`),

    // Currency
    getCurrencies: () => get(`${BASE}/currency`),
    createCurrency: (data) => post(`${BASE}/currency`, data),
    updateCurrency: (id, data) => put(`${BASE}/currency/${id}`, data),
    deleteCurrency: (id) => del(`${BASE}/currency/${id}`),
  }
}
