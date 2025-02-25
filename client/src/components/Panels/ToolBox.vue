<template>
    <div class="unified-panel" aria-labelledby="toolbox-heading">
        <div unselectable="on">
            <div class="unified-panel-header-inner">
                <nav class="d-flex justify-content-between mx-3 my-2">
                    <h2 v-if="!showAdvanced" id="toolbox-heading" v-localize class="m-1 h-sm">Tools</h2>
                    <h2 v-else id="toolbox-heading" v-localize class="m-1 h-sm">Advanced Tool Search</h2>
                    <div class="panel-header-buttons">
                        <b-button-group>
                            <FavoritesButton v-if="!showAdvanced" :query="query" @onFavorites="onQuery" />
                            <PanelViewButton
                                v-if="panelViews && Object.keys(panelViews).length > 1"
                                :panel-views="panelViews"
                                :current-panel-view="currentPanelView"
                                @updatePanelView="updatePanelView" />
                        </b-button-group>
                    </div>
                </nav>
            </div>
        </div>
        <div class="unified-panel-controls">
            <ToolSearch
                enable-advanced
                :current-panel-view="currentPanelView"
                :placeholder="titleSearchTools"
                :show-advanced.sync="showAdvanced"
                :toolbox="tools"
                :query="query"
                :query-pending="queryPending"
                @onQuery="onQuery"
                @onResults="onResults" />
            <section v-if="!showAdvanced">
                <UploadButton />
                <div v-if="hasResults" class="pb-2">
                    <b-button size="sm" class="w-100" @click="onToggle">
                        <span :class="buttonIcon" />
                        <span class="mr-1">{{ buttonText }}</span>
                    </b-button>
                </div>
                <div v-else-if="queryTooShort" class="pb-2">
                    <b-badge class="alert-danger w-100">Search string too short!</b-badge>
                </div>
                <div v-else-if="queryFinished" class="pb-2">
                    <b-badge class="alert-danger w-100">No results found!</b-badge>
                </div>
                <div v-if="closestTerm" class="pb-2">
                    <b-badge class="alert-danger w-100">
                        Did you mean:
                        <i>
                            <a href="javascript:void(0)" @click="onQuery(closestTerm)">{{ closestTerm }}</a>
                        </i>
                        ?
                    </b-badge>
                </div>
            </section>
        </div>
        <div v-if="!showAdvanced" class="unified-panel-body">
            <div class="toolMenuContainer">
                <div class="toolMenu">
                    <ToolSection
                        v-for="(section, key) in sections"
                        :key="key"
                        :category="section"
                        :query-filter="queryFilter"
                        @onClick="onOpen" />
                </div>
                <ToolSection :category="{ text: 'Workflows' }" />
                <div id="internal-workflows" class="toolSectionBody">
                    <div class="toolSectionBg" />
                    <div v-for="wf in workflows" :key="wf.id" class="toolTitle">
                        <a class="title-link" :href="wf.href">{{ wf.title }}</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { getGalaxyInstance } from "app";
import UploadButton from "components/Upload/UploadButton";
import { useGlobalUploadModal } from "composables/globalUploadModal";
import { getAppRoot } from "onload";
import _l from "utils/localization";

import FavoritesButton from "./Buttons/FavoritesButton";
import PanelViewButton from "./Buttons/PanelViewButton";
import ToolSearch from "./Common/ToolSearch";
import ToolSection from "./Common/ToolSection";
import { filterTools, filterToolSections, hasResults, hideToolsSection } from "./utilities";

export default {
    components: {
        UploadButton,
        FavoritesButton,
        PanelViewButton,
        ToolSection,
        ToolSearch,
    },
    props: {
        toolbox: {
            type: Array,
            required: true,
        },
        panelViews: {
            type: Object,
        },
        currentPanelView: {
            type: String,
        },
    },
    setup() {
        const { openGlobalUploadModal } = useGlobalUploadModal();
        return { openGlobalUploadModal };
    },
    data() {
        return {
            closestTerm: null,
            query: null,
            results: null,
            queryFilter: null,
            queryPending: false,
            showSections: false,
            showAdvanced: false,
            buttonText: "",
            buttonIcon: "",
            titleSearchTools: _l("search tools"),
        };
    },
    computed: {
        tools() {
            return hideToolsSection(this.toolbox);
        },
        queryTooShort() {
            return this.query && this.query.length < 3;
        },
        queryFinished() {
            return this.query && this.queryPending != true;
        },
        sections() {
            if (this.showSections) {
                return filterToolSections(this.tools, this.results);
            } else {
                return hasResults(this.results) ? filterTools(this.tools, this.results) : this.tools;
            }
        },
        isUser() {
            const Galaxy = getGalaxyInstance();
            return !!(Galaxy.user && Galaxy.user.id);
        },
        workflows() {
            const Galaxy = getGalaxyInstance();
            const storedWorkflowMenuEntries = Galaxy && Galaxy.config.stored_workflow_menu_entries;
            if (storedWorkflowMenuEntries) {
                return [
                    {
                        title: _l("All workflows"),
                        href: `${getAppRoot()}workflows/list`,
                        id: "list",
                    },
                    ...storedWorkflowMenuEntries.map((menuEntry) => {
                        return {
                            id: menuEntry.id,
                            title: menuEntry.name,
                            href: `${getAppRoot()}workflows/run?id=${menuEntry.id}`,
                        };
                    }),
                ];
            } else {
                return [];
            }
        },
        hasResults() {
            return this.results && this.results.length > 0;
        },
    },
    methods: {
        onQuery(q) {
            this.query = q;
            this.queryPending = true;
        },
        onResults(results, closestTerm = null) {
            this.results = results;
            this.closestTerm = closestTerm;
            this.queryFilter = this.hasResults ? this.query : null;
            this.setButtonText();
            this.queryPending = false;
        },
        onOpen(tool, evt) {
            if (tool.id === "upload1") {
                evt.preventDefault();
                this.openGlobalUploadModal();
            } else if (tool.form_style === "regular") {
                evt.preventDefault();
                // encode spaces in tool.id
                const toolId = tool.id;
                this.$router.push(`/?tool_id=${encodeURIComponent(toolId)}&version=latest`);
            }
        },
        onToggle() {
            this.showSections = !this.showSections;
            this.setButtonText();
        },
        setButtonText() {
            this.buttonText = this.showSections ? _l("Hide Sections") : _l("Show Sections");
            this.buttonIcon = this.showSections ? "fa fa-eye-slash" : "fa fa-eye";
        },
        updatePanelView(panelView) {
            this.$emit("updatePanelView", panelView);
        },
    },
};
</script>
