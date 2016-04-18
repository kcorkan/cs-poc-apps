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
    _updateSummaryContainer: function(){

        var summary = this.down('#summaryBox'),
            projectID = this.getContext().getProject().ObjectID,
            quarters = this._getQuarters();

        var summaryInfo = [];
        Ext.Array.each(quarters, function(q){

            summaryInfo.push({
                Pin: this._getPlatformPinName(),
                Quarter: q,
                TeamSprintCapacity: this.projectInfoStore.getTeamSprintCapacity(projectID),
                homeDemand: this.demandCalculator && this.demandCalculator.getHomeDemand(q) || 0,
                totalDemand: this.demandCalculator && this.demandCalculator.getTotalDemand(q) || 0
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

        this.down('#filterBox').add({
            xtype: 'rallycheckboxfield',
            fieldLabel: 'View Visitor Requests',
            value: false,
            itemId: 'showVisitingRequests',
            labelAlign: 'right',
            labelWidth: 150
        });

        this.down('#showVisitingRequests').on('change', this._updateDisplay, this);
        this.down('#quarterComboBox').on('select', this._updateDisplay, this);

        this._updateDisplay();
    },
    /**
     * _getFilters - filters the data (on the server) before it is returned.
     * We are using Context: Project = null becuase we always need to return all demand for the current pin,
     * even if it is not in scope.
     *
     * This function will return ALL the data we need for the filtering and calculations on this page, so we are only loading it
     * when the project changes.
     *
     * @returns {*}
     * @private
     */
    _getFilters: function(){
        var quarters = this._getQuarters(),
            filters = [];

        //if (quarters && quarters.length > 0){ //We have validated that quarters are selected, so we should always have quarters
        //
        //    //TODO: change this depending on how we want to filter quarters (by PlannedStart or PlannedEndDates or by planning field)
        //    Ext.Array.each(quarters, function(q){
        //        if (q && q.length > 0){
        //            filters.push(Ext.create('Rally.data.wsapi.Filter', {
        //                property: this.planningQuarterField,
        //                value: q || ""
        //            }));
        //        }
        //    }, this);
        //}

        var pin = this._getPlatformPinObjectID();

        filters.push ({
            property: 'c_RequestedPins',
            operator: 'contains',
            value: '"' + pin + '"'
        });

        return Rally.data.wsapi.Filter.or(filters);
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

    _updateDisplay: function(){

        this.down('#gridBox').removeAll();

        if (!this._validateSelections()){
            return;
        }

        //Now build the model and start loading data
        ExtendedModelBuilder.build(this.parentTypePath, 'PortfolioItemWithBuildingBlocks').then({
            success: this._buildGrid,
            failure: this._showError,
            scope: this
        });
    },
    _getShowVisitingDemand: function(){
        return this.down('#showVisitingRequests') && this.down('#showVisitingRequests').getValue() || false;
    },
    _showError: function(message){
        Rally.ui.notify.Notifier.showError({message: message});
    },
    /**
     * _postProcessData includes:
     *     -- loading external data (if it is being stored externally)
     *     -- filtering data locally (if scoped to show visiting pins as well
     *    applying other local filters (note that we still need to rollup all demand for the current
     *    pin, which is why we need to filter locally
     * @param store
     * @param records
     * @private
     */
    _postProcessData: function(store, records, operation){
        this.demandCalculator = Ext.create('DemandCalculator', {
            records: records, //We want to assign this before we filter so we have access to the entire loaded data set regardless of what was filtered locally.
            homePin: this._getPlatformPinObjectID()
        });

        this.down('#dataGrid').getStore().filterBy(this._filterDisplayData, this);
    },
    /**
     * _filterDisplayData - if show visiting demand, filter pins for visiting teams only.
     * otherwise, filter out all items that are not in this pin that do not use the current pin.
     *
     * If we add other filters (e.g. State), then those need to be filtered here becuase we still need the current demand
     *
     * NOTE:  This is just filtering for display, not for demand calculation, which requires all of the data that was returned.
     * @param item
     * @returns {boolean}
     * @private
     */
    _filterDisplayData: function(item){
        var thisProjectPin = this._getPlatformPinObjectID(),
            pinRegExp = new RegExp('\"' + thisProjectPin + '\"');
        if (this._getShowVisitingDemand()){
            return item.get('Project').ObjectID !== thisProjectPin &&
                pinRegExp.test(item.get('c_RequestedPins'));
        }
        return this.projectInfoStore.getPinRecordForProject(item.get('Project').ObjectID).get('ObjectID') === thisProjectPin ;
    },
    _buildGrid: function(model){

        var grid = this.down('#gridBox').add({
            xtype: 'rallygrid',
            itemId: 'dataGrid',
            stateful: false,
            storeConfig: {
                model: model,
                fetch: this.parentFetch,
                filters: this._getFilters(),
                listeners: {
                    load: this._postProcessData,
                    datachanged: this._updateSummaryContainer,
                    scope: this
                },
                context: {
                    project: null  // We will always need to load all data for the demand, even when we aren't viewing visitor teams so this needs to be null
                }
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
                 //we need to re-expand the expander so that the height gets reset.  There may be a more elegant way to do this, but it needs to be researched.
                 var recordIndex = document.getElementById(n.id) &&
                                    document.getElementById(n.id).dataset &&
                                    document.getElementById(n.id).dataset.recordindex,

                     record = recordIndex ? grid.getStore().getAt(recordIndex) : null;

                 if (record){
                     this._expandRowBody(n,record, n);
                 }
             }
        }, this);
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

                        return Ext.String.format('{0} / {1}', home, total-home);
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

                    if (!Ext.isArray(selectedTeam)){
                        selectedTeam = [selectedTeam];
                    }

                    var data = [],
                        quarters = this._getQuarters();

                    Ext.Array.each(quarters, function(q){
                        Ext.Array.each(selectedTeam, function(t){
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
                    record.appendBuildingBlock(data);
                }
            }
        });
        dlg.show();
    }
});
