Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    parentTypePath: 'portfolioitem/roadmap',
    planningQuarterField: 'c_PlanningQuarter',
    parentFetch: ['FormattedID','Name','ObjectID','Project'],
    projectFetchList: ['ObjectID','Name','Parent'],
    buildingBlockField: 'c_BuildingBlock',

    demandField: 'c_TotalDemandVisitor',

    items: [{
        xtype:'container',
        itemId: 'filterBox',
        layout: 'hbox'
    },{
        xtype: 'container',
        itemId: 'summaryBox'
    },{
        xtype:'container',
        itemId: 'gridBox'
    }],

    launch: function() {

        var projectFetchList = this.projectFetchList.concat([this.buildingBlockField]);

        Deft.Promise.all([
            Toolbox.loadProjects(projectFetchList)
        ]).then({
            scope:this,
            success: function(results) {
                this.buildingBlockData = Toolbox.buildProjectPinBuildingBlockData(results[0]);
                this._addComponents();
            },
            failure: function(message) {
                Rally.ui.notify.Notifier.showError({message: 'Error retrieving projects: ' + message});
            }
        });
    },
    _addComponents: function() {
        //add summary and filter containor

        this._addFilterComponent();
        this._addSummaryComponent();
    },
    _addSummaryComponent: function() {
        console.log("inside summary component");

        var summary_tpl = Ext.create('SummaryTemplate');

        this.down('#summaryBox').tpl = summary_tpl;

        //this.add({
        //    xtype: 'container',
        //    itemId: 'summaryBox',
        //    flex: 1,
        //    style: {
        //        textAlign: 'right',
        //        cursor: 'pointer'
        //    },
        //    tpl: summary_tpl
        //});
        this._updateSummaryContainer();
    },
    _updateSummaryContainer: function(){
        var summary = this.down('#summaryBox');
        summary.update({
            Pin: this._getPlatformPin(),
            Quarter: this.down('#quarterComboBox') && this.down('#quarterComboBox').getValue() || "None Selected",
            TeamSprintCapacity: this._getTeamSprintCapacity()
        });

    },
    _getTeamSprintCapacity: function(){
        return '200';
    },
    _getPlatformPin: function(){
        return this.getContext().getProject().Name;
    },
    _addFilterComponent: function() {

       this.down('#filterBox').add({
                xtype: 'rallyfieldvaluecombobox',
                itemId: 'quarterComboBox',
                fieldLabel: 'Planning Quarter:',
                labelAlign: 'right',
                model: this.parentTypePath,
                field: this.planningQuarterField
            });
        this.down('#filterBox').add({
                xtype: 'rallyfieldvaluecombobox',
                itemId: 'stateComboBox',
                fieldLabel: 'State:',
                labelAlign: 'right',
                multiSelect: true,
                model: this.parentTypePath,
                field: 'State'
            });


        this.down('#stateComboBox').on('select', this._onSelect, this);
        this.down('#quarterComboBox').on('select', this._onSelect, this);

        this._displayGrid();

    },
    _getFilters: function(){
        var state = this.down('#stateComboBox').getValue(),
            quarter = this.down('#quarterComboBox').getValue(),
            stateFilters = null,
            quarterFilter = null;

        if (state){
            stateFilters = _.map(state, function(s){ return {
                property: 'State',
                value: s || ""
                };
            });
            stateFilters = Rally.data.wsapi.Filter.or(stateFilters);
        }

        if (quarter){
            quarterFilter = Ext.create('Rally.data.wsapi.Filter', {
                property: this.planningQuarterField,
                value: quarter || ""
            });
        }

        if (stateFilters && quarterFilter){
            return stateFilters.and(quarterFilter);
        }
        return stateFilters || quarterFilter || [];
    },
    _onSelect: function(cb) {
        var grid = this.down('rallygrid'),
        store = grid.getStore(),
            filters = this._getFilters();
        store.clearFilter(true);
        if (filters){
            store.addFilter(filters, true);
        }
        store.load();
        this._updateSummaryContainer();
    },
    _displayGrid: function(){

        this.down('#gridBox').removeAll();

        if (this.down('dataGrid')){
            this.down('dataGrid').destroy();
        }

        this._buildGrid();
    },
    _updateModels: function(store, records){
        Ext.Array.each(records, function(r){
            r.set('homeDemand', 4);
            r.set('visitorDemand',4);
            r.set('totalDemand', 8);
            r.set('buildingBlocks',[{
                team: 'home',
                pin:  "Home PIN",
                name: 'BB1',
                amount: 4
            },{
                team: 'visiting',
                pin:  'PIN1',
                name: 'BB2',
                amount: 3
            },{
                team: 'visiting',
                pin:  'PIN1',
                name: 'BB3',
                amount: 1
            }]);
        });
    },
    _buildGrid: function(){
        var grid = this.down('#gridBox').add({
            xtype: 'rallygrid',
            itemId: 'dataGrid',

            storeConfig: {
                model: this.parentTypePath,
                fetch: this.parentFetch,
                autoLoad: true,
                listeners: {
                    load: this._updateModels,
                    scope: this
                }
            },
            margin: 25,
            columnCfgs: this._getColumnCfgs(),
            bulkEditConfig: {
                    items: [{
                        xtype: 'examplebulkrecordmenuitem'
                    }]
            },
            showRowActionsColumn: true,
            plugins: [{
                ptype: 'rowexpander',
                rowBodyTpl: '<div id="planning-{FormattedID}"> </div>'
            }]
        });
        grid.getView().on('expandbody', this._expandRowBody, this);
    },

    _expandRowBody: function(rowNode, record, expandRow, options){
        var ct = Ext.get(expandRow.querySelector('#planning-' + record.get('FormattedID'))),
            data = record.get('buildingBlocks');

        console.log('_expandRowBody', rowNode, record, expandRow, options, ct);
        ct.setHeight(200);

        var grid = ct.down('#planning-row-' + record.get('FormattedID'));
        if (grid){
            console.log('grid found', grid);
            grid.destroy();
        }

        Ext.create('Rally.ui.grid.Grid',{
            itemId: 'planning-row-' + record.get('FormattedID'),
            store: Ext.create('Rally.data.custom.Store',{
                data: data,
                fields: ['team','pin','name','amount'],
                groupField: 'team',
                groupDir: 'ASC',
                getGroupString: function(record) {
                    var team = record.get('team');
                    if (team === "home"){
                        return 'Home Team';
                    }
                    return "Visiting Teams";
                }
            }),
            pageSize: data.length,
            showPagingToolbar: false,
            hideHeaders: true,
            features: [{
                ftype: 'groupingsummary',
                groupHeaderTpl: '{name} ({rows.length})',
                startCollapsed: false
            }],
            columnCfgs: [{
                dataIndex: 'pin',
                text: 'pin',
                flex: 1
            },{
                dataIndex: 'name',
                text: 'name',
                flex: 1
            },{
                dataIndex: 'amount',
                text: 'amount',
                editor: {
                    xtype: 'rallynumberfield',
                    listeners: {
                        change: function(x,y,z){
                            console.log('nb', x,y,z, record);
                        }
                    }
                }
            }],
            renderTo: ct
        });

    },
    _getColumnCfgs: function(){
        return [{
            dataIndex: 'FormattedID'
        },{
            dataIndex: 'Name'
        },{
            dataIndex: 'Project'
        },{
            xtype: 'templatecolumn',
            text: 'Total Demand',
            tpl: '{homeDemand} + {visitorDemand} = {totalDemand}'
        },{
            xtype: 'templatecolumn',
            text: 'Home Demand',
            tpl: '{homeDemand}'
        },{
            xtype: 'templatecolumn',
            text: 'Visitor Demand',
            tpl: '{visitorDemand}'
        },{
            dataIndex: 'PlannedStartDate'
        },{
            dataIndex: 'PlannedEndDate'
        }];
    }
});
