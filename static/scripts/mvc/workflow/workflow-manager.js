define(["mvc/workflow/workflow-connector"],function(a){function b(a,b){this.app=a,this.canvas_container=b,this.id_counter=0,this.nodes={},this.name=null,this.has_changes=!1,this.active_form_has_changes=!1,this.nodeLabels={}}return $.extend(b.prototype,{canLabelNodeWith:function(a){return a?!(a in this.nodeLabels):!0},registerNodeLabel:function(a){a&&(this.nodeLabels[a]=!0)},unregisterNodeLabel:function(a){a&&delete this.nodeLabels[a]},updateNodeLabel:function(a,b){a&&this.unregisterNodeLabel(a),this.canLabelNodeWith(b)||alert("Workflow contains duplicate node labels "+b+". This must be fixed before it can be saved."),b&&this.registerNodeLabel(b)},attemptUpdateNodeLabel:function(a,b){return this.canLabelNodeWith(b)?(a.setLabel(b),!0):!1},create_node:function(a,b,c){var d=this.app.prebuildNode(a,b,c);return this.add_node(d),this.fit_canvas_to_nodes(),this.app.canvas_manager.draw_overview(),this.activate_node(d),d},add_node:function(a){a.id=this.id_counter,a.element.attr("id","wf-node-step-"+a.id),this.id_counter++,this.nodes[a.id]=a,this.has_changes=!0,a.workflow=this},remove_node:function(a){this.active_node==a&&this.clear_active_node(),delete this.nodes[a.id],this.has_changes=!0},remove_all:function(){wf=this,$.each(this.nodes,function(a,b){b.destroy(),wf.remove_node(b)})},rectify_workflow_outputs:function(){var a=!1,b=!1;if($.each(this.nodes,function(c,d){d.workflow_outputs&&d.workflow_outputs.length>0&&(a=!0),$.each(d.post_job_actions,function(a,c){"HideDatasetAction"===c.action_type&&(b=!0)})}),a!==!1||b!==!1){var c=this;$.each(this.nodes,function(b,d){if("tool"===d.type){var e=!1;null==d.post_job_actions&&(d.post_job_actions={},e=!0);var f=[];$.each(d.post_job_actions,function(a,b){"HideDatasetAction"==b.action_type&&f.push(a)}),f.length>0&&$.each(f,function(a,b){e=!0,delete d.post_job_actions[b]}),a&&$.each(d.output_terminals,function(a,b){var c=!d.isWorkflowOutput(b.name);if(c===!0){e=!0;var f={action_type:"HideDatasetAction",output_name:b.name,action_arguments:{}};d.post_job_actions["HideDatasetAction"+b.name]=null,d.post_job_actions["HideDatasetAction"+b.name]=f}}),c.active_node==d&&e===!0&&c.reload_active_node()}})}},to_simple:function(){var a={};return $.each(this.nodes,function(b,c){var d={};$.each(c.input_terminals,function(a,b){d[b.name]=null;var c=[];$.each(b.connectors,function(a,e){c[a]={id:e.handle1.node.id,output_name:e.handle1.name},d[b.name]=c})});var e={};c.post_job_actions&&$.each(c.post_job_actions,function(a,b){var c={action_type:b.action_type,output_name:b.output_name,action_arguments:b.action_arguments};e[b.action_type+b.output_name]=null,e[b.action_type+b.output_name]=c}),c.workflow_outputs||(c.workflow_outputs=[]);var f={id:c.id,type:c.type,tool_id:c.content_id,tool_state:c.tool_state,tool_errors:c.tool_errors,input_connections:d,position:$(c.element).position(),annotation:c.annotation,post_job_actions:c.post_job_actions,uuid:c.uuid,label:c.label,workflow_outputs:c.workflow_outputs};a[c.id]=f}),{steps:a}},from_simple:function(b){wf=this;var c=0;wf.name=b.name;var d=!1;$.each(b.steps,function(a,b){var e=wf.app.prebuildNode(b.type,b.name,b.tool_id);e.init_field_data(b),b.position&&e.element.css({top:b.position.top,left:b.position.left}),e.id=b.id,wf.nodes[e.id]=e,c=Math.max(c,parseInt(a)),d||"tool"!==e.type||(e.workflow_outputs.length>0?d=!0:$.each(e.post_job_actions,function(a,b){"HideDatasetAction"===b.action_type&&(d=!0)}))}),wf.id_counter=c+1,$.each(b.steps,function(b,c){var e=wf.nodes[b];$.each(c.input_connections,function(b,c){c&&($.isArray(c)||(c=[c]),$.each(c,function(c,d){var f=wf.nodes[d.id],g=new a;g.connect(f.output_terminals[d.output_name],e.input_terminals[b]),g.redraw()}))}),d&&"tool"===e.type&&$.each(e.output_terminals,function(a,b){void 0===e.post_job_actions["HideDatasetAction"+b.name]&&(e.addWorkflowOutput(b.name),callout=$(e.element).find(".callout."+b.name),callout.find("img").attr("src",Galaxy.root+"static/images/fugue/asterisk-small.png"),wf.has_changes=!0)})})},check_changes_in_active_form:function(){this.active_form_has_changes&&(this.has_changes=!0,$("#right-content").find("form").submit(),this.active_form_has_changes=!1)},reload_active_node:function(){if(this.active_node){var a=this.active_node;this.clear_active_node(),this.activate_node(a)}},clear_active_node:function(){this.active_node&&(this.active_node.make_inactive(),this.active_node=null),this.app.showToolForm("<div>No node selected</div>",{id:"no-node"})},activate_node:function(a){this.active_node!=a&&(this.check_changes_in_active_form(),this.clear_active_node(),this.app.showToolForm(a.form_html,a),a.make_active(),this.active_node=a)},node_changed:function(a,b){this.has_changes=!0,this.active_node==a&&b&&(this.check_changes_in_active_form(),this.app.showToolForm(a.form_html,a))},layout:function(){this.check_changes_in_active_form(),this.has_changes=!0;var a={},b={};for($.each(this.nodes,function(c){void 0===a[c]&&(a[c]=0),void 0===b[c]&&(b[c]=[])}),$.each(this.nodes,function(c,d){$.each(d.input_terminals,function(c,e){$.each(e.connectors,function(c,e){var f=e.handle1.node;a[d.id]+=1,b[f.id].push(d.id)})})}),node_ids_by_level=[];;){level_parents=[];for(var c in a)0==a[c]&&level_parents.push(c);if(0==level_parents.length)break;node_ids_by_level.push(level_parents);for(var d in level_parents){var e=level_parents[d];delete a[e];for(var f in b[e])a[b[e][f]]-=1}}if(!a.length){var g=this.nodes,h=80;v_pad=30;var i=h;$.each(node_ids_by_level,function(a,b){b.sort(function(a,b){return $(g[a].element).position().top-$(g[b].element).position().top});var c=0,d=v_pad;$.each(b,function(a,b){var e=g[b],f=$(e.element);$(f).css({top:d,left:i}),c=Math.max(c,$(f).width()),d+=$(f).height()+v_pad}),i+=c+h}),$.each(g,function(a,b){b.redraw()})}},bounds_for_all_nodes:function(){var a,b=1/0,c=-(1/0),d=1/0,f=-(1/0);return $.each(this.nodes,function(g,h){e=$(h.element),a=e.position(),b=Math.min(b,a.left),c=Math.max(c,a.left+e.width()),d=Math.min(d,a.top),f=Math.max(f,a.top+e.width())}),{xmin:b,xmax:c,ymin:d,ymax:f}},fit_canvas_to_nodes:function(){function a(a,b){return Math.ceil(a/b)*b}function b(a,b){return b>a||a>3*b?(new_pos=(Math.ceil(a%b/b)+1)*b,-(a-new_pos)):0}var c=this.bounds_for_all_nodes(),d=this.canvas_container.position(),e=this.canvas_container.parent(),f=b(c.xmin,100),g=b(c.ymin,100);f=Math.max(f,d.left),g=Math.max(g,d.top);var h=d.left-f,i=d.top-g,j=a(c.xmax+100,100)+f,k=a(c.ymax+100,100)+g;j=Math.max(j,-h+e.width()),k=Math.max(k,-i+e.height()),this.canvas_container.css({left:h,top:i,width:j,height:k}),this.canvas_container.children().each(function(){var a=$(this).position();$(this).css("left",a.left+f),$(this).css("top",a.top+g)})}}),b});
//# sourceMappingURL=../../../maps/mvc/workflow/workflow-manager.js.map