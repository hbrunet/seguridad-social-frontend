<template>
  <v-card class="mx-auto my-12" max-width="1200">
    <v-card-title>
      <v-icon class="mr-2">mdi-history</v-icon>
      Historial de Ejecuciones de Procesos
    </v-card-title>

    <v-card-text>
      <!-- Filtros -->
      <v-row class="mb-4" align="end">
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.createdBy"
            label="Ejecutado por"
            clearable
            density="compact"
          />
        </v-col>
         <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.periodo"
            label="Período"
            type="month"
            clearable
            density="compact"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.fechaInicio"
            label="Fecha inicio"
            type="date"
            clearable
            density="compact"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="filters.jobType"
            :items="jobTypes"
            item-value="value"
            item-title="title"
            label="Tipo de Proceso"
            clearable
            density="compact"
            :return-object="false"
            @update:model-value="onJobTypeChange"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.jobId"
            label="ID"
            clearable
            density="compact"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="itemsPerPage"
            :items="pageSizeOptions"
            label="Items por página"
            density="compact"
            @update:model-value="changeItemsPerPage"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-btn color="primary" block :disabled="loading" @click="fetchAudits" prepend-icon="mdi-magnify">
            Buscar
          </v-btn>
        </v-col>
      </v-row>

      <!-- Tabla -->
      <v-data-table
        :headers="headers"
        :items="audits"
        :items-length="totalItems"
        :loading="loading"
        v-model:page="page"
        :items-per-page="itemsPerPage"
        class="elevation-1"
        item-key="jobId"
      >
        <template v-slot:[`item.started_at`]="{ value }">
          {{ formatFechaHora(value) }}
        </template>
        <template v-slot:[`item.completed_at`]="{ value }">
          {{ formatFechaHora(value) }}
        </template>
        <template v-slot:[`item.input_params`]="{ value }">
          {{ formatInputParams(value) }}
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <v-menu location="bottom end">
            <template #activator="{ props }">
              <v-btn icon variant="text" v-bind="props" aria-label="Opciones">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item @click="openLogs(item)">
                <v-list-item-title>Ver logs</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
        <template v-slot:[`item.status`]="{ item }">
          <v-chip :color="statusColor(item.status)" size="small" :prepend-icon="statusIcon(item.status)">
            {{ item.status ?? '—' }}
          </v-chip>
        </template>
        <template v-slot:bottom>
          <div class="text-center pa-4">
            <v-pagination
              v-model="page"
              :length="Math.ceil(totalItems / itemsPerPage)"
              :total-visible="7"
              @update:model-value="changePage"
            ></v-pagination>
          </div>
        </template>
      </v-data-table>

      <v-dialog v-model="logsDialog" max-width="900">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-file-document-outline</v-icon>
            Logs del proceso {{ selectedJobId || '—' }}
            <v-spacer />
            <v-btn icon variant="text" @click="logsDialog = false" aria-label="Cerrar">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-alert v-if="logsError" type="error" density="compact" class="mb-3">
              {{ logsError }}
            </v-alert>
            <v-skeleton-loader v-if="logsLoading" type="table" />
            <v-data-table
              v-else
              :headers="logsHeaders"
              :items="logsTableItems"
              class="elevation-0"
              density="compact"
              :items-per-page="10"
            >
              <template v-slot:[`item.timestamp`]="{ value }">
                {{ formatFechaHora(value) }}
              </template>
              <template #no-data>
                <div class="text-caption">Sin logs para mostrar.</div>
              </template>
            </v-data-table>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="logsDialog = false">Cerrar</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card-text>
  </v-card>
</template>

<script>
import { getJobAudits, getJobLogs } from '../api/procesos';
import { getJobTypes } from '../api/configuracion';
import { formatFechaHora, formatPeriodo } from '../utils/formatDate';



export default {
  name: 'HistorialEjecuciones',
  data() {
    return {
      loading: false,
      audits: [],
      totalItems: 0,
      filters: {
        createdBy: '',
        fechaInicio: '', // YYYY-MM-DD
        jobType: '',
        jobId: '',
        periodo: '' // YYYY-MM
      },
      page: 1,
      itemsPerPage: 10,
      headers: [
        { title: 'ID', value: 'job_id' },
        { title: 'Tipo', value: 'job_type' },
        { title: 'Periodo', value: 'input_params' },
        { title: 'Ejecutado por', value: 'created_by' },
        { title: 'Inicio', value: 'started_at' },
        { title: 'Fin', value: 'completed_at' },
        { title: 'Estado', value: 'status' },
        { title: 'Error', value: 'error_message' },
        { title: '', value: 'actions', sortable: false, align: 'end', width: 48 }
      ],
      pageSizeOptions: [10, 25, 50, 100],
      jobTypes: [],
      logsDialog: false,
      logsLoading: false,
      logsItems: [],
      logsError: '',
      selectedJobId: null,
      logsHeaders: [
        { title: 'Fecha', value: 'timestamp' },
        { title: 'Tipo', value: 'level' },
        { title: 'Mensaje', value: 'message' }
      ]
    };
  },
  computed: {
    logsTableItems() {
      return (this.logsItems || []).map(this.normalizeLogItem);
    }
  },
  created() {
    this.loadJobTypes();
    this.fetchAudits();
  },
  methods: {
    formatFechaHora,
    async loadJobTypes() {
      try {
        const res = await getJobTypes();
        if (res.ok) {
          const data = res.data?.items || res.data || [];
          const list = Array.isArray(data) ? data : [];
          console.log('Job types loaded:', list);
          this.jobTypes = list.map(jt => ({
            value: jt.id,
            title: jt.name
          }));
          console.log('Mapped jobTypes:', this.jobTypes);
        }
      } catch (e) {
        console.error('loadJobTypes error:', e);
      }
    },
  // (loadJobTypes added above)
    async fetchAudits() {
      this.loading = true;
      try {
        const params = {
          createdBy: this.filters.createdBy || undefined,
          fechaInicio: this.filters.fechaInicio || undefined,
          jobType: this.filters.jobType || undefined,
          jobId: this.filters.jobId || undefined,
          periodo: this.filters.periodo || undefined,
          pageSize: this.itemsPerPage
        };
        console.log('Fetching audits with params:', params);
        console.log('Sending params to API:', params);
        const res = await getJobAudits(params);
        if (res.ok) {
          this.audits = res.data?.items || [];
          console.log('Fetched audits:', this.audits);
          this.totalItems = res.data.total;
          console.log('data:', res.data);
        } else {
          this.audits = [];
          this.totalItems = 0;
        }
      } catch (e) {
        this.audits = [];
        this.totalItems = 0;
        console.error('fetchAudits error:', e);
      } finally {
        this.loading = false;
      }
    },
    changePage(newPage) {
      this.page = newPage;
      this.fetchAudits();
    },
    onJobTypeChange(value) {
      // Extraer el valor si viene como objeto
      this.filters.jobType = value?.value || value || '';
      console.log('jobType changed to:', this.filters.jobType, 'type:', typeof this.filters.jobType);
      this.page = 1; // Reset a página 1 cuando cambia el filtro
      this.fetchAudits();
    },
    changeItemsPerPage(value) {
      this.itemsPerPage = value;
      this.page = 1; // Reset a página 1 cuando cambia el tamaño de página
      this.fetchAudits();
    },
    statusColor(s) {
      const val = (s || '').toString().toLowerCase();
      if (['completed', 'completado', '2'].includes(val)) return 'success';
      if (['running', 'ejecutando', '1'].includes(val)) return 'primary';
      if (['pending', 'pendiente', '0'].includes(val)) return 'warning';
      if (['failed', 'error', '3'].includes(val)) return 'error';
      if (['cancelled', 'cancelado', '4'].includes(val)) return 'grey';
      return 'default';
    },
    statusIcon(s) {
      const val = (s || '').toString().toLowerCase();
      if (['completed', 'completado', '2'].includes(val)) return 'mdi-check-circle';
      if (['running', 'ejecutando', '1'].includes(val)) return 'mdi-cog';
      if (['pending', 'pendiente', '0'].includes(val)) return 'mdi-timer-sand';
      if (['failed', 'error', '3'].includes(val)) return 'mdi-alert-circle';
      if (['cancelled', 'cancelado', '4'].includes(val)) return 'mdi-cancel';
      return 'mdi-help-circle';
    },
    getJobId(item) {
      return item?.job_id ?? item?.jobId ?? item?.id ?? null;
    },
    async openLogs(item) {
      const jobId = this.getJobId(item);
      this.selectedJobId = jobId;
      this.logsDialog = true;
      this.logsLoading = true;
      this.logsItems = [];
      this.logsError = '';

      if (!jobId) {
        this.logsLoading = false;
        this.logsError = 'No se encontró el ID del job.';
        return;
      }

      try {
        const res = await getJobLogs(jobId);
        if (res.ok) {
          this.logsItems = res.data?.items || [];
        } else {
          this.logsError = res.error || 'No fue posible obtener los logs.';
        }
      } catch (e) {
        this.logsError = 'Error al obtener los logs.';
        console.error('openLogs error:', e);
      } finally {
        this.logsLoading = false;
      }
    },
    normalizeLogItem(log) {
      if (log == null) {
        return { timestamp: '—', level: '—', message: '—' };
      }
      if (typeof log === 'string') {
        return { timestamp: '—', level: '—', message: log };
      }

      const timestamp =
        log.timestamp ??
        log.log_timestamp ??
        log.time ??
        log.created_at ??
        log.createdAt ??
        '—';

      const level =
        log.level ??
        log.log_level ??
        log.severity ??
        log.nivel ??
        '—';

      const message =
        log.message ??
        log.log_message ??
        log.mensaje ??
        log.msg ??
        '—';

      return { timestamp, level, message };
    },
    formatInputParams(value) {
      if (value == null || value === '') return '—';
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return formatPeriodo(parsed?.Periodo) ?? '—';
        } catch (e) {
          return '—';
        }
      }
      return '—';
    }
  }
};
</script>
