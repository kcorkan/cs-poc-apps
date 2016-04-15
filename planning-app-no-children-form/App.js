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
                change: this._displayGrid,
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
        }

        //now get the pin filters
        if (showVisitorRequests){
            var pin = this._getPlatformPinObjectID();

            filters = Ext.create('Rally.data.wsapi.Filter',{
                property: 'c_RequestedPins',
                operator: 'contains',
                value: '"' + pin + '"'
            });
        }

         if (filters && quarterFilters){
            filters =  quarterFilters.and(filters);
            console.log('_getFilters', filters.toString());
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
        console.log('_loadExternalData',records);

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
        console.log('_getProjectContext');
        if (showVisitors){
            console.log('showVisitors = true');
            return {
                project: null
            };
        }
        return {
            project: this.getContext().getProject()._ref,
            projectScopeDown: true
        };
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
                rowBodyTpl: '<div id="planning-{FormattedID}"></div>'
            }]
        });
        grid.on('afterlayout', this._restoreRowHeight, this);
        grid.getView().on('expandbody', this._expandRowBody, this);
        grid.getView().on('collapsebody', this._collapseRowBody, this);
    },
    /**
     * addresses the issue where the row height gets reset and hides any currently expanded rows
     * @private
     */
    _restoreRowHeight: function(grid){
         Ext.Array.each(grid.getView().getNodes(), function(n){
             var collapsed = /x-grid-row-collapsed/.test(n.className);
             if (!collapsed){
                 //we need to do something here to reset the rowheight
                 console.log('node expanded');
             }
        });
    },
    _collapseRowBody: function(rowNode, record, expandRow, options){
        var ctCmp = Ext.getCmp(this._getBuildingBlockCmpId(record));

        if (ctCmp){
            ctCmp.destroy();
        }
    },
    _getBuildingBlockCmpId: function(record){
        return 'buildingBlock-' + record.get('FormattedID');
    },
    _expandRowBody: function(rowNode, record, expandRow, options){
        var quarters = this._getQuarters(),
            ctId = '#planning-' + record.get('FormattedID'),
            ct = Ext.get(expandRow.querySelector(ctId));

        var bbct = Ext.create('BuildingBlockComponent',{
            id: this._getBuildingBlockCmpId(record),
            record: record,
            quarters: quarters,
            renderTo: ct
        });
        ct.setHeight(bbct.getHeight());
    },
    _getColumnCfgs: function(){
        var me = this,
            quarters = this._getQuarters(),
            homePin = this._getPlatformPinObjectID();

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
            dataIndex: 'Name',
            flex: 2
        }];

        quarters = quarters || [];
        Ext.Array.each(quarters, function(q){
            if (q && q.length > 0){
                columns.push({
                    dataIndex: '__demand',
                    text: q + ' Demand (Home / Visiting)',
                    flex: 1,
                    renderer: function(v,m,r) {
                        var home = r.getDemand(q,homePin),
                            total = r.getDemand(q);

                        return Ext.String.format('{0}/{1}', home, total-home);
                    }
                });
            }
        });

        columns = columns.concat([{
           dataIndex: 'Project',
            flex: 1
        },{
           dataIndex: 'PlannedStartDate',
            flex: 1
        },{
           dataIndex: 'PlannedEndDate',
            flex: 1
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
