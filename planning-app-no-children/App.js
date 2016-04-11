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
    _buildGrid: function(){
        this.add({
            xtype: 'rallygrid',
            itemId: 'dataGrid',
            storeConfig: {
                model: this.parentTypePath,
                fetch: this.parentFetch,
                autoLoad: true
            },
            columnCfgs: this._getColumnCfgs(),
            bulkEditConfig: {
                    items: [{
                        xtype: 'examplebulkrecordmenuitem'
                    }]
            },
            showRowActionsColumn: true,
            plugins: [{
                ptype: 'rowexpander',
                rowBodyTpl: new Ext.XTemplate('<p>{Name}</p>{[this.getBuildingBlocks(values)]}',{
                    getBuildingBlocks: function(values){
                        return Ext.String.format('<br/><span class="building-blocks">Building Blocks go here...</span>');
                    }
                })
            }]
        });
    },
    _getColumnCfgs: function(){
        return [{
            dataIndex: 'FormattedID'
        },{
            dataIndex: 'Name'
        },{
            dataIndex: 'Project'
        }];
    }
});
