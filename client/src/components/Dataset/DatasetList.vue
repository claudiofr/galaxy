<template>
    <div class="overflow-auto h-100" @scroll="onScroll">
        <div v-if="error" class="alert alert-danger" show>{{ error }}</div>
        <div v-else>
            <b-alert :variant="messageVariant" :show="showMessage">{{ message }}</b-alert>
            <DelayedInput class="m-1 mb-3" placeholder="Search Datasets" @change="onQuery" />
            <b-table
                id="dataset-table"
                striped
                no-sort-reset
                no-local-sorting
                :fields="fields"
                :items="rows"
                @sort-changed="onSort">
                <template v-slot:cell(name)="row">
                    <DatasetName :item="row.item" @showDataset="onShowDataset" @copyDataset="onCopyDataset" />
                </template>
                <template v-slot:cell(history_id)="row">
                    <DatasetHistory :item="row.item" />
                </template>
                <template v-slot:cell(tags)="row">
                    <StatelessTags
                        :value="row.item.tags"
                        :disabled="row.item.deleted"
                        @input="(tags) => onTags(tags, row.index)" />
                </template>
                <template v-slot:cell(update_time)="data">
                    <UtcDate :date="data.value" mode="elapsed" />
                </template>
            </b-table>
            <LoadingSpan v-if="loading" message="Loading datasets" />
            <div v-if="showNotFound">
                No matching entries found for: <span class="font-weight-bold">{{ query }}</span
                >.
            </div>
            <div v-if="showNotAvailable">No datasets found.</div>
        </div>
    </div>
</template>
<script>
import { getGalaxyInstance } from "app";
import DelayedInput from "components/Common/DelayedInput";
import LoadingSpan from "components/LoadingSpan";
import StatelessTags from "components/TagsMultiselect/StatelessTags";
import UtcDate from "components/UtcDate";
import { mapActions } from "pinia";

import { useHistoryStore } from "@/stores/historyStore";

import DatasetHistory from "./DatasetHistory";
import DatasetName from "./DatasetName";
import { copyDataset, getDatasets, updateTags } from "./services";

export default {
    components: {
        DatasetHistory,
        DatasetName,
        LoadingSpan,
        DelayedInput,
        UtcDate,
        StatelessTags,
    },
    data() {
        return {
            error: null,
            scrolled: false,
            fields: [
                {
                    key: "name",
                    sortable: true,
                },
                {
                    key: "tags",
                    sortable: false,
                },
                {
                    label: "History",
                    key: "history_id",
                    sortable: true,
                },
                {
                    key: "extension",
                    sortable: true,
                },
                {
                    label: "Updated",
                    key: "update_time",
                    sortable: true,
                },
                {
                    key: "context",
                    label: "",
                    sortable: false,
                },
            ],
            query: "",
            limit: 50,
            offset: 0,
            sortBy: "update_time",
            sortDesc: true,
            loading: true,
            message: null,
            messageVariant: "danger",
            rows: [],
        };
    },
    computed: {
        showNotFound() {
            return !this.loading && this.rows.length === 0 && this.query;
        },
        showNotAvailable() {
            return !this.loading && this.rows.length === 0 && !this.query;
        },
        showMessage() {
            return !!this.message;
        },
    },
    created() {
        this.load();
    },
    methods: {
        ...mapActions(useHistoryStore, ["applyFilters"]),
        load(concat = false) {
            this.loading = true;
            getDatasets({
                query: this.query,
                sortBy: this.sortBy,
                sortDesc: this.sortDesc,
                offset: this.offset,
                limit: this.limit,
            })
                .then((datasets) => {
                    if (concat) {
                        this.rows = this.rows.concat(datasets);
                    } else {
                        this.rows = datasets;
                    }
                    this.loading = false;
                })
                .catch((error) => {
                    this.error = error;
                });
        },
        onCopyDataset(item) {
            const Galaxy = getGalaxyInstance();
            const history = Galaxy.currHistoryPanel;
            const dataset_id = item.id;
            const history_id = history.model.id;
            copyDataset(dataset_id, history_id)
                .then((response) => {
                    history.loadCurrentHistory();
                })
                .catch((error) => {
                    this.onError(error);
                });
        },
        async onShowDataset(item) {
            const { history_id } = item;
            const filters = {
                deleted: item.deleted,
                visible: item.visible,
                hid: item.hid,
            };
            try {
                await this.applyFilters(history_id, filters);
            } catch (error) {
                this.onError(error);
            }
        },
        onTags(tags, index) {
            const item = this.rows[index];
            item.tags = tags;
            updateTags(item.id, "HistoryDatasetAssociation", tags).catch((error) => {
                this.onError(error);
            });
        },
        onQuery(query) {
            this.query = query;
            this.offset = 0;
            this.load();
        },
        onSort(props) {
            this.sortBy = props.sortBy;
            this.sortDesc = props.sortDesc;
            this.offset = 0;
            this.load();
        },
        onScroll({ target: { scrollTop, clientHeight, scrollHeight } }) {
            if (scrollTop + clientHeight >= scrollHeight) {
                if (this.offset + this.limit <= this.rows.length) {
                    this.offset += this.limit;
                    this.load(true);
                }
            }
        },
        onError(message) {
            this.message = message;
        },
    },
};
</script>
