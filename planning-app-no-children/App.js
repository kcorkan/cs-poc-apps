var data = [];
Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    parentTypePath: 'portfolioitem/roadmap',
    planningQuarterField: 'c_PlanningQuarter',
    parentFetch: ['FormattedID','Name','ObjectID','Project','c_RequestedPins'],
    projectFetchList: ['ObjectID','Name','Parent'],
    buildingBlockField: 'c_BuildingBlock',
    teamCapacityField: 'c_Capacity',

    items: [{
        xtype:'container',
        itemId: 'filterBox',
        layout: 'hbox',
        padding: 10
    },{
        xtype: 'container',
        itemId: 'summaryBox',
        padding: 10
    },{
        xtype:'container',
        itemId: 'gridBox',
        padding: 10
    }],

    launch: function() {

        var projectFetchList = this.projectFetchList.concat([this.buildingBlockField, this.teamCapacityField]);

        Deft.Promise.all([
            Toolbox.loadProjects(projectFetchList)
        ]).then({
            scope:this,
            success: function(results) {
                 this.projectInfoStore =Ext.create('ProjectInformationStore',{
                    projectRecords: results[0]
                });
                this._addComponents();
            },
            failure: function(message) {
                Rally.ui.notify.Notifier.showError({message: 'Error retrieving projects: ' + message});
            }
        });
    },

    _addComponents: function() {

        this.down('#filterBox').removeAll();

        //validate that we are running within the scope of a PIN.
        if (!this._getPlatformPin()){
            console.log('this', this._getPlatformPin());
            this.down('#filterBox').add({
                xtype: 'container',
                html: "Please choose a Project Scope that is associated with a valid PIN."
            });
            return;
        }

        this._addFilterComponent();
        this._addSummaryComponent();
    },
    _addSummaryComponent: function() {
        this.down('#summaryBox').tpl = Ext.create('SummaryTemplate');
        this._updateSummaryContainer();
    },
    _updateSummaryContainer: function(validationMessage){

        var summary = this.down('#summaryBox'),
            projectID = this.getContext().getProject().ObjectID,
            quarters = this._getQuarters(),
            pin = this._getPlatformPin(),
            records = this.down('#dataGrid') && this.down('#dataGrid').getStore().getRange() || [];

        var summaryInfo = [];
        Ext.Array.each(quarters, function(q){
            var homeDemand = this._getDemand(records, q, pin.get("ObjectID")),
                totalDemand = this._getDemand(records, q);

            summaryInfo.push({
                Pin: this._getPlatformPinName(),
                Quarter: q,
                TeamSprintCapacity: this.projectInfoStore.getTeamSprintCapacity(projectID),
                homeDemand: homeDemand,
                totalDemand: totalDemand
            });
        }, this);


        if (quarters.length === 0){
            summaryInfo.push({
                Pin: this._getPlatformPinName(),
                Quarter: '<div style="color:red;">Please select at least 1 quarter to plan</div>',
                TeamSprintCapacity: '--',
                homeDemand: '--',
                totalDemand: '--'
            });
        }

        summary.update(summaryInfo);
    },
    _getDemand: function(records, quarter, homePin){
        var demand = 0;
        Ext.Array.each(records, function(r){
            console.log('record',r, demand, quarter);
           demand += r.getDemand(quarter,homePin); //If homepin is empty, then it will calculate the total demand
        });
        return demand;
    },
    _getPlatformPin: function(){
        return this.projectInfoStore.getPinRecordForProject(this.getContext().getProject().ObjectID);
    },
    _getPlatformPinName: function(){
        var pin = this._getPlatformPin();
        return pin && pin.get('Name') || "No PIN";
    },
    _getPlatformPinObjectID: function(){
        var pin = this._getPlatformPin();
        return pin && pin.get('ObjectID') || 0;
    },
    _addFilterComponent: function() {

       this.down('#filterBox').add({
                xtype: 'rallyfieldvaluecombobox',
                itemId: 'quarterComboBox',
                fieldLabel: 'Planning Quarter:',
                labelAlign: 'right',
                allowNoEntry: false,
                model: this.parentTypePath,
                field: this.planningQuarterField,
                multiSelect: true,
                allowBlank: false
        });

        //this.down('#filterBox').add({
        //        xtype: 'rallyfieldvaluecombobox',
        //        itemId: 'stateComboBox',
        //        fieldLabel: 'State:',
        //        labelAlign: 'right',
        //        multiSelect: true,
        //        model: this.parentTypePath,
        //        field: 'State',
        //        allowNoEntry: false
        //});

        this.down('#filterBox').add({
            xtype: 'rallycheckboxfield',
            fieldLabel: 'View Visitor Requests',
            value: false,
            itemId: 'showVisitingRequests',
            labelAlign: 'right',
            labelWidth: 150,
            listeners: {
                select: this._displayGrid,
                scope: this
            }
        });

       // this.down('#stateComboBox').on('select', this._onSelect, this);
        this.down('#quarterComboBox').on('select', this._displayGrid, this);

        this._displayGrid();
    },
    _getFilters: function(){
        //var state = this.down('#stateComboBox').getValue(),
        var quarters = this._getQuarters(),
            filters = null,
            quarterFilters = null,
            showVisitorRequests = this.down('#showVisitingRequests').getValue();

        //if (state && state.length > 0){
        //    stateFilters = [];
        //    Ext.Array.each(state, function(s){
        //        if (s && s.length > 0){
        //            stateFilters.push({
        //                property: 'State',
        //                value: s || ""
        //            });
        //        }
        //    });
        //    stateFilters = Rally.data.wsapi.Filter.or(stateFilters);
        //    console.log('_getFilters stateFilters', stateFilters && stateFilters.toString());
        //}

        if (quarters && quarters.length > 0){
            quarterFilters = [];
            Ext.Array.each(quarters, function(q){
                if (q && q.length > 0){
                    quarterFilters.push(Ext.create('Rally.data.wsapi.Filter', {
                        property: this.planningQuarterField,
                        value: q || ""
                    }));
                }

            }, this);
            quarterFilters = Rally.data.wsapi.Filter.or(quarterFilters);
            console.log('_getFilters quarterFilters', quarterFilters && quarterFilters.toString());
        }

        //now get the pin filters
        if (showVisitorRequests){
            var pin = this.projectInfoStore.getPinRecordForProject(this.getContext().getProject().ObjectID).get('ObjectID');
            filters = Ext.create('Rally.data.wsapi.Filter',{
                property: 'c_RequestedPins',
                operator: 'contains',
                value: pin
            });
        }

        //if (stateFilters && quarterFilters){
        if (filters && quarterFilters){
            filters =  filters.and(quarterFilters);
            return filters;
        }
        return filters || quarterFilters || [];
    },
    _getQuarters: function(){
        return Ext.Array.filter(this.down('#quarterComboBox').getValue() || [], function(q){
            return q && q.length > 0;
        });
    },
    _validateSelections: function(){
        console.log('_validateSelections', this._getQuarters());
        if (this._getQuarters().length > 0){
            return true;
        }

        this._updateSummaryContainer("Please select at least 1 quarter to plan.");
        return false;
    },

    _displayGrid: function(){

        this.down('#gridBox').removeAll();

        if (!this._validateSelections()){
            return;
        }

        ExtendedModelBuilder.build(this.parentTypePath, 'PortfolioItemWithBuildingBlocks').then({
            success: this._buildGrid,
            failure: this._showError,
            scope: this
        });
    },
    _showError: function(message){
        Rally.ui.notify.Notifier.showError({message: message});
    },
    _loadExternalData: function(store, records){

        var objectIDs = _.map(records, function(r){
            return r.get('ObjectID');
        }),
            quarters = this._getQuarters();
        console.log('quarters', quarters);

        this._fetchExternalData(objectIDs, quarters).then({
            success: function(data){
                Ext.Array.each(records, function(r){
                    ///r.updateBuildingBlocks(data);
                });
                this._updateSummaryContainer();
            },
            failure: this._showError,
            scope: this
        });

    },
    _fetchExternalData: function(objectIDs, quarters){
        var deferred = Ext.create('Deft.Deferred');

        //We get Phuocs stuff
        deferred.resolve(data);

        return deferred;
    },
    _getProjectContext: function(){
        var showVisitors = this.down('#showVisitingRequests').getValue();

        if (showVisitors){
            return {project: null};
        }
        return {
            project: this.getContext().getProject()._ref,
            projectScopeDown: true
        };
    },
    _buildTreeGrid: function(model){

        Ext.create('Rally.data.wsapi.Store',{
            model: model,
            filters: this._getFilters(),
            fetch: this.parentFetch
        }).load({
            callback: function(records, operation, success){
                console.log('_buildTreeGrid', records);
                var children = [];
                Ext.Array.each(records, function(r){
                    children.push(r.getData());
                });

                console.log('children',children);
                var store = Ext.create('Ext.data.TreeStore', {
                    root: {
                        expanded: true,
                        children: children
                    }
                });

                this.down('#gridBox').add({
                    xtype: 'treepanel',
                    store: store,
                    rootVisible: false,
                    cls: 'rally-grid'
                });
            },
            scope: this
        });


    },
    _buildGrid: function(model){
        var projectContext = this._getProjectContext();

        var grid = this.down('#gridBox').add({
            xtype: 'rallygrid',
            itemId: 'dataGrid',
            stateful: false,
            storeConfig: {
                model: model,
                fetch: this.parentFetch,
                autoLoad: true,
                filters: this._getFilters(),
                listeners: {
                    load: this._loadExternalData,
                    datachanged: this._updateSummaryContainer,
                    scope: this
                },
                context: projectContext
            },
            margin: 25,
            columnCfgs: this._getColumnCfgs(),
            showRowActionsColumn: false,
            plugins: [{
                ptype: 'rowexpander',
                rowBodyTpl: '<div id="planning-{FormattedID}"> </div>'
            }]
        });
        grid.getView().on('expandbody', this._expandRowBody, this);
    },
    _expandRowBody: function(rowNode, record, expandRow, options){
        var ct = Ext.get(expandRow.querySelector('#planning-' + record.get('FormattedID'))),
            quarters = this._getQuarters();

        var grid = this.down('#planning-row-' + record.get('FormattedID'));
        if (this.grid){
            this.grid.destroy();
        }

        var columnCfgs = [{
            dataIndex: 'pin',
            text: 'Building Block',
            flex: 1,
            renderer: function(v,m,r){
                return r.get('pinName') + ' - ' + r.get('buildingBlock');
            }
        }];

        Ext.Array.each(quarters, function(q){
            if (q && q.length > 0){
                columnCfgs.push({
                    dataIndex: q,
                    text: q,
                    flex: 1,
                    editor: {
                        xtype: 'rallynumberfield'
                    }
                });
            }
        });


        this.grid = Ext.create('Rally.ui.grid.Grid',{
            itemId: 'planning-row-' + record.get('FormattedID'),
            store: this._transformDataToTempStoreData(record, quarters),
            pageSize: data.length,
            showPagingToolbar: false,
            columnCfgs: columnCfgs,
            renderTo: ct
        });
        ct.setHeight(200);
    },
    _transformDataToTempStoreData: function(record, quarters){
        var hash = {};
        var fields = ['pin','pinName','buildingBlock'].concat(quarters),
            jsonData = Ext.JSON.decode(record.get('c_RequestedPins') || "[]");

        Ext.Array.each(jsonData || [], function(bb){
            console.log('inside bb', bb);
            var bbDisplayName = bb.pinName + ' - ' + bb.buildingBlock;
            if (bb.quarter && bb.quarter.length > 0){
                if (!hash[bbDisplayName]){
                    hash[bbDisplayName] = {
                        pin: bb.pin,
                        pinName: bb.pinName,
                        buildingBlock: bb.buildingBlock
                    };
                }
                hash[bbDisplayName][bb.quarter] = (bb.demand || 0) + (hash[bbDisplayName][bb.quarter] || 0);
            }
        });

        var data = _.values(hash);

        return Ext.create('Rally.data.custom.Store',{
            data: data,
            fields: fields,
            listeners: {
                scope: this,
                update: function(store){
                    record.updateBuildingBlocks(this._transformDataFromTempStore(store, quarters));
                    this._updateSummaryContainer();
                }
            }
        });
    },
    _transformDataFromTempStore: function(store, quarters){
        var data = [],
            bbs =  _.map(store.getRange(), function(bb){ return bb.getData(); });

        Ext.Array.each(bbs, function(bb){
            Ext.Array.each(quarters, function(q){
                console.log('bb',bb,q);
                if (bb[q] >= 0){
                    data.push({
                        pin: bb.pin,
                        pinName: bb.pinName,
                        buildingBlock: bb.buildingBlock,
                        quarter: q,
                        demand: bb[q]
                    });
                }
            });
        });
        return data;
    },
    _getColumnCfgs: function(){
        var me = this,
            quarters = this._getQuarters();

        var columns = [{
            xtype: 'rallyrowactioncolumn',
            rowActionsFn: function (record) {
                return [
                    {
                        xtype: 'rallyrecordmenuitem',
                        record: record,
                        text: "Add Home Building Block...",
                        handler: function () {
                            me._showBuildingBlockPicker(true, record);
                        },
                        scope: this
                    },
                    {
                        xtype: 'rallyrecordmenuitem',
                        record: record,
                        text: "Add Visitor Building Block...",
                        handler: function () {
                            me._showBuildingBlockPicker(false, record);
                        },
                        scope: this
                    }
                ];
            }
        },{
            dataIndex: 'FormattedID'
        },{
            dataIndex: 'Name'
        }];

        quarters = quarters || [];
        Ext.Array.each(quarters, function(q){
            if (q && q.length > 0){
                columns.push({
                    dataIndex: '__demand',
                    text: q + ' Demand',
                    renderer: function(v,m,r) {
                        return r.getDemand(q);
                    }
                });
            }
        });

        columns = columns.concat([{
           dataIndex: 'Project'
        },{
           dataIndex: 'PlannedStartDate'
        },{
           dataIndex: 'PlannedEndDate'
        }]);
        return columns;
    },
    _showBuildingBlockPicker: function(isHome, record){

        var projectObjectID = this.getContext().getProject().ObjectID,
            teamFields = ['buildingBlock','pinName','pin'],
            teamData = this.projectInfoStore.getBuildingBlockOptions(projectObjectID, isHome);

        var dlg = Ext.create('Rally.ui.dialog.CustomChooserDialog',{
            teamFields: teamFields,
            teamData: teamData,
            listeners: {
                scope: this,
                itemchosen: function(dlg, selectedTeam){
                    var bbs = this.buildBuildingBlockData(selectedTeam);
                    record.appendBuildingBlock(bbs);
                }
            }
        });
        dlg.show();
    },
    buildBuildingBlockData: function(teams){
        if (!Ext.isArray(teams)){
            teams = [teams];
        }
        var data = [],
            quarters = this._getQuarters();

        Ext.Array.each(quarters, function(q){
            Ext.Array.each(teams, function(t){
                var tData = t.getData();
                data.push({
                    pin: tData.pin,
                    pinName: tData.pinName,
                    buildingBlock: tData.buildingBlock,
                    quarter: q,
                    demand: 0
                });
            });
        });
        return data;
    }
});
