import { apiGet, apiPost, apiPut, apiDelete } from './http';
import apiClient from '../lib/axios';

/* ------------------------------------------------------------------ */
/*  Schema Metadata API                                               */
/* ------------------------------------------------------------------ */

export async function fetchAllSchemas() {
  const res = await apiGet('/admin/schema');
  return res.data || [];
}

export async function fetchSchema(slug) {
  const res = await apiGet(`/admin/schema/${slug}`);
  return res.data;
}

export async function createSchema(payload) {
  const res = await apiPost('/admin/schema', payload);
  window.dispatchEvent(new CustomEvent('weeb:menu-updated'));
  return res.data;
}

export async function updateSchema(slug, payload) {
  const res = await apiPut(`/admin/schema/${slug}`, payload);
  window.dispatchEvent(new CustomEvent('weeb:menu-updated'));
  return res.data;
}

export async function deleteSchema(slug) {
  const res = await apiDelete(`/admin/schema/${slug}`);
  window.dispatchEvent(new CustomEvent('weeb:menu-updated'));
  return res.data;
}

export async function addSchemaField(slug, payload) {
  const res = await apiPost(`/admin/schema/${slug}/fields`, payload);
  return res.data;
}

export async function updateSchemaField(slug, fieldId, payload) {
  const res = await apiPut(`/admin/schema/${slug}/fields/${fieldId}`, payload);
  return res.data;
}

export async function deleteSchemaField(slug, fieldId) {
  const res = await apiDelete(`/admin/schema/${slug}/fields/${fieldId}`);
  return res.data;
}

/* ------------------------------------------------------------------ */
/*  Database Introspection API                                        */
/* ------------------------------------------------------------------ */

export async function introspectSchemas() {
  const res = await apiGet('/admin/schema/_introspect');
  return res.data || [];
}

export async function introspectTables(schema) {
  const res = await apiGet(`/admin/schema/_introspect/${schema}`);
  return res.data || [];
}

export async function introspectColumns(schema, table) {
  const res = await apiGet(`/admin/schema/_introspect/${schema}/${table}`);
  return res.data || { columns: [], primary_key: null };
}

/* ------------------------------------------------------------------ */
/*  Dynamic Runtime Data CRUD API                                     */
/* ------------------------------------------------------------------ */

export async function fetchDynamicData(slug, params = {}) {
  const res = await apiGet(`/admin/dynamic/${slug}`, params);
  return res;
}

export async function fetchDynamicRecord(slug, id) {
  const res = await apiGet(`/admin/dynamic/${slug}/${id}`);
  return res.data;
}

export async function createDynamicRecord(slug, payload) {
  const res = await apiPost(`/admin/dynamic/${slug}`, payload);
  return res.data;
}

export async function updateDynamicRecord(slug, id, payload) {
  const res = await apiPut(`/admin/dynamic/${slug}/${id}`, payload);
  return res.data;
}

export async function deleteDynamicRecord(slug, id) {
  const res = await apiDelete(`/admin/dynamic/${slug}/${id}`);
  return res.data;
}

export async function importDynamicCsv(slug, formDataOrText) {
  let payload;
  let headers = {};

  if (formDataOrText instanceof FormData) {
    payload = formDataOrText;
    headers['Content-Type'] = 'multipart/form-data';
  } else {
    payload = { csv_text: formDataOrText };
  }

  const res = await apiPost(`/admin/dynamic/${slug}/import`, payload, { headers });
  return res.data;
}

export function getExportCsvUrl(slug, search, filters = {}) {
  const queryParams = new URLSearchParams();
  queryParams.set('format', 'csv');
  if (search) queryParams.set('search', search);

  Object.entries(filters).forEach(([key, val]) => {
    if (val !== '' && val !== null && val !== undefined) {
      queryParams.set(`f_${key}`, val);
    }
  });

  return `${apiClient.defaults.baseURL}/admin/dynamic/${slug}?${queryParams.toString()}`;
}

export function getCsvTemplateUrl(slug) {
  return `${apiClient.defaults.baseURL}/admin/dynamic/${slug}?format=csv&template=1`;
}

/* ------------------------------------------------------------------ */
/*  Menu Management API                                               */
/* ------------------------------------------------------------------ */

export async function fetchAllMenus() {
  const res = await apiGet('/admin/menu');
  return res.data || [];
}

export async function saveMenuSettings(items) {
  const res = await apiPut('/admin/menu', { items });
  window.dispatchEvent(new CustomEvent('weeb:menu-updated'));
  return res.data || [];
}
