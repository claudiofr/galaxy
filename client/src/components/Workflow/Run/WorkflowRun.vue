<template>
    <span>
        <b-alert v-if="error" variant="danger" show>
            <h2 class="h-text">Workflow cannot be executed. Please resolve the following issue:</h2>
            {{ error }}
        </b-alert>
        <span v-else>
            <b-alert v-if="loading" variant="info" show>
                <LoadingSpan message="Loading workflow run data" />
            </b-alert>
            <WorkflowRunSuccess v-else-if="!!invocations" :invocations="invocations" :workflow-name="workflowName" />
            <div v-else class="ui-form-composite">
                <div class="ui-form-composite-messages mb-4">
                    <b-alert v-if="hasUpgradeMessages" variant="warning" show>
                        Some tools in this workflow may have changed since it was last saved or some errors were found.
                        The workflow may still run, but any new options will have default values. Please review the
                        messages below to make a decision about whether the changes will affect your analysis.
                    </b-alert>
                    <b-alert v-if="hasStepVersionChanges" variant="warning" show>
                        Some tools are being executed with different versions compared to those available when this
                        workflow was last saved because the other versions are not or no longer available on this Galaxy
                        instance. To upgrade your workflow and dismiss this message simply edit the workflow and re-save
                        it.
                    </b-alert>
                    <b-alert v-if="submissionError" variant="danger" show>
                        Workflow submission failed: {{ submissionError }}
                    </b-alert>
                </div>
                <WorkflowRunFormSimple
                    v-if="simpleForm"
                    :model="model"
                    :target-history="simpleFormTargetHistory"
                    :use-job-cache="simpleFormUseJobCache"
                    @submissionSuccess="handleInvocations"
                    @submissionError="handleSubmissionError"
                    @showAdvanced="showAdvanced" />
                <WorkflowRunForm
                    v-else
                    :model="model"
                    @submissionSuccess="handleInvocations"
                    @submissionError="handleSubmissionError" />
            </div>
        </span>
    </span>
</template>

<script>
import LoadingSpan from "components/LoadingSpan";
import { mapState } from "pinia";
import { useHistoryItemsStore } from "stores/history/historyItemsStore";
import { errorMessageAsString } from "utils/simple-error";

import { useHistoryStore } from "@/stores/historyStore";

import { WorkflowRunModel } from "./model";
import { getRunData } from "./services";
import WorkflowRunForm from "./WorkflowRunForm";
import WorkflowRunFormSimple from "./WorkflowRunFormSimple";
import WorkflowRunSuccess from "./WorkflowRunSuccess";

export default {
    components: {
        LoadingSpan,
        WorkflowRunSuccess,
        WorkflowRunForm,
        WorkflowRunFormSimple,
    },
    props: {
        workflowId: {
            type: String,
            required: true,
        },
        preferSimpleForm: {
            type: Boolean,
            default: false,
        },
        simpleFormTargetHistory: {
            type: String,
            default: "current",
        },
        simpleFormUseJobCache: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            error: null,
            loading: true,
            hasUpgradeMessages: false,
            hasStepVersionChanges: false,
            workflowName: "",
            invocations: null,
            simpleForm: null,
            submissionError: null,
            model: null,
        };
    },
    computed: {
        ...mapState(useHistoryStore, ["currentHistoryId", "getHistoryById"]),
        ...mapState(useHistoryItemsStore, ["getLastUpdateTime"]),
        historyStatusKey() {
            return `${this.currentHistoryId}_${this.getLastUpdateTime}`;
        },
    },
    watch: {
        historyStatusKey() {
            if (!this.invocations) {
                this.loadRun();
            }
        },
    },
    created() {
        this.loadRun();
    },
    methods: {
        handleInvocations(invocations) {
            this.invocations = invocations;
            // make sure any new histories are added to historyStore
            this.invocations.forEach((invocation) => {
                this.getHistoryById(invocation.history_id);
            });
        },
        handleSubmissionError(error) {
            this.submissionError = errorMessageAsString(error);
        },
        loadRun() {
            getRunData(this.workflowId)
                .then((runData) => {
                    this.loading = false;
                    const model = new WorkflowRunModel(runData);
                    let simpleForm = this.preferSimpleForm;
                    if (simpleForm) {
                        // These only work with PJA - the API doesn't evaluate them at
                        // all outside that context currently. The main workflow form renders
                        // these dynamically and takes care of all the validation and setup details
                        // on the frontend. If these are implemented on the backend at some
                        // point this restriction can be lifted.
                        if (model.hasReplacementParametersInToolForm) {
                            console.log("cannot render simple workflow form - has ${} values in tool steps");
                            simpleForm = false;
                        }
                        // If there are required parameters in a tool form (a disconnected runtime
                        // input), we have to render the tool form steps and cannot use the
                        // simplified tool form.
                        if (model.hasOpenToolSteps) {
                            console.log(
                                "cannot render simple workflow form - one or more tools have disconnected runtime inputs"
                            );
                            simpleForm = false;
                        }
                        // Just render the whole form for resource request parameters (kind of
                        // niche - I'm not sure anyone is using these currently anyway).
                        if (model.hasWorkflowResourceParameters) {
                            console.log(
                                `Cannot render simple workflow form - workflow resource parameters are configured`
                            );
                            simpleForm = false;
                        }
                    }
                    this.simpleForm = simpleForm;
                    this.model = model;
                    this.hasUpgradeMessages = model.hasUpgradeMessages;
                    this.hasStepVersionChanges = model.hasStepVersionChanges;
                    this.workflowName = this.model.name;
                })
                .catch((response) => {
                    this.error = errorMessageAsString(response);
                });
        },
        showAdvanced() {
            this.simpleForm = false;
        },
    },
};
</script>
