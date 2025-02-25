<template>
    <div>
        <b-card v-if="!simple" class="citation-card" header-tag="nav">
            <template v-slot:header>
                <b-nav card-header tabs>
                    <b-nav-item
                        :active="outputFormat === outputFormats.CITATION"
                        @click="outputFormat = outputFormats.CITATION"
                        >Citations (APA)</b-nav-item
                    >
                    <b-nav-item
                        :active="outputFormat === outputFormats.BIBTEX"
                        @click="outputFormat = outputFormats.BIBTEX"
                        >BibTeX</b-nav-item
                    >
                </b-nav>
            </template>
            <div v-if="source === 'histories'" class="infomessage">
                <div v-html="config.citations_export_message_html"></div>
            </div>
            <div class="citations-formatted">
                <Citation
                    v-for="(citation, index) in citations"
                    :key="index"
                    class="formatted-reference"
                    :citation="citation"
                    :output-format="outputFormat" />
            </div>
        </b-card>
        <div v-else-if="citations.length">
            <b-btn v-b-toggle="id" variant="primary">Citations</b-btn>
            <b-collapse
                :id="id.replace(/ /g, '_')"
                class="mt-2"
                @show="$emit('show')"
                @shown="$emit('shown')"
                @hide="$emit('hide')"
                @hidden="$emit('hidden')">
                <b-card>
                    <Citation
                        v-for="(citation, index) in citations"
                        :key="index"
                        class="formatted-reference"
                        :citation="citation"
                        :output-format="outputFormat" />
                </b-card>
            </b-collapse>
        </div>
    </div>
</template>
<script>
import BootstrapVue from "bootstrap-vue";
import Vue from "vue";

import { useConfig } from "@/composables/config";

import Citation from "./Citation";
import { getCitations } from "./services";

Vue.use(BootstrapVue);

const outputFormats = Object.freeze({
    CITATION: "bibliography",
    BIBTEX: "bibtex",
    RAW: "raw",
});

export default {
    components: {
        Citation,
    },
    props: {
        source: {
            type: String,
            required: true,
        },
        id: {
            type: String,
            required: true,
        },
        simple: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    setup() {
        const { config } = useConfig(true);
        return { config };
    },
    data() {
        return {
            citations: [],
            errors: [],
            showCollapse: false,
            outputFormats,
            outputFormat: outputFormats.CITATION,
        };
    },
    updated() {
        this.$nextTick(() => {
            this.$emit("rendered");
        });
    },
    created() {
        getCitations(this.source, this.id)
            .then((citations) => {
                this.citations = citations;
            })
            .catch((e) => {
                console.error(e);
            });
    },
};
</script>
<style>
.citation-card .card-header .nav-tabs {
    margin-bottom: -0.75rem !important;
}
.formatted-reference {
    margin-bottom: 0.5rem;
}
</style>
