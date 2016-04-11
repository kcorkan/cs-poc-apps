Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    parentTypePath: 'portfolioitem/roadmap',
    parentFetch: ['FormattedID','Name','ObjectID','Project'],
    projectFetchList: ['ObjectID','Name','Parent'],
    buildingBlockField: 'c_BuildingBlock',

    demandField: 'c_TotalDemandVisitor',

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
        this._addSummaryComponent();
        this._addFilterComponent();
    },
    _addSummaryComponent: function() {
        console.log("inside summary component");
       /*this.add({
                xtype: 'rallygrid',
                itemId: 'summaryGrid',
                storeConfig: {
                    model: this.parentTypePath,
                    fetch: this.parentFetch,
                    autoLoad: true
                },
                context: this.getContext(),
                enableEditing: false
        });*/
    },
    _addFilterComponent: function() {
        this.add({
                        xtype: 'rallyfieldvaluecombobox',
                        itemId: 'stateComboBox',
                        fieldLabel: 'Unsized RMI:',
                        model: this.parentTypePath,
                        field: 'State',
                        listeners: {
                            select: this._onSelect,
                            ready: this._onLoad,
                            scope: this
                        }
        });

    },
    _onLoad: function () {
        this._displayGrid();
    },
    _getStateFilter: function() {
        return {
                    property: 'State',
                    operator: '=',
                    value: this.down('#stateComboBox').getValue()
                };
    },      
    _onSelect: function() {
        var grid = this.down('rallygrid'),
        store = grid.getStore();
            
        store.clearFilter(true);
        store.filter(this._getStateFilter());
    },
    _displayGrid: function(){
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
        })
    },
    _buildGrid: function(){
        var grid = this.add({
            xtype: 'rallygrid',



            itemId: 'dataGrid',

            storeConfig: {
                model: this.parentTypePath,
                fetch: this.parentFetch,
                autoLoad: true,
                listeners: {
                    load: this._updateModels,
                    scope: this
                },
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

    _expandRowBody2: function(rowNode, record, expandRow, options){

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
                        return 'Home Team'
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
