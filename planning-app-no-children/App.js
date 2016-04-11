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
            Toolbox.loadProjects(projectFetchList),
        ]).then({
            scope:this,
            success: function(results) {
                this.buildingBlockData = Toolbox.buildProjectPinBuildingBlockData(results[0]);
                this._displayGrid();
            },
            failure: function(message) {
                Rally.ui.notify.Notifier.showError({message: 'Error retrieving projects: ' + message});
            }
        });
    },
    _displayGrid: function(){
        if (this.down('rallygrid')){
            this.down('rallygrid').destroy();
        }

        this._buildGrid();
    },
    _buildGrid: function(){
        this.add({
            xtype: 'rallygrid',
            storeConfig: {
                model: this.parentTypePath,
                fetch: this.parentFetch,
                autoLoad: true
            },
            columnCfgs: this._getColumnCfgs(),
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
