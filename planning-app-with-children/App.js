Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    teamData:[],
    teamFields:[],
    parentTypePath: 'portfolioitem/marketablefeature',
    subfeatureTypePath: 'portfolioitem/engrsubfeature',
    subFeatureModel: null,
    launch: function() {
        Deft.Promise.all([this._loadProjects(),this._getModelObject(this.subfeatureTypePath)]).then({
            scope:this,
            success: function(results) {
                this._buildProjectStore(results[0]);
                console.log("subFeatureModel",results[1],results[2]);
                this.subFeatureModel=results[1];
                this._buildStore();
            },
            failure: function(message) {
                console.log("got error from load projects");
            }
        });
    },
    _getModelObject: function(name) {
        var deffered=Ext.create('Deft.Deferred');
        Rally.data.ModelFactory.getModel({
            type: name,
            success: function(model) {
                deffered.resolve(model);
            }
        });
        return deffered.promise;
    },
    _buildBuildingBlockStore: function(records){

    },
    _buildProjectStore: function(records) {
        console.log("record",records);
        this.teamData=Toolbox.buildCustomProjectData(records,'c_BuildingBlock');
        this.teamFields = ['Name','BuildingBlock','Path','ObjectID'];
        //var store = this._buildCustomStore(data,fields);
        //console.log("_buildCustomStoreData",store);
        //this._addGrid(store, fields);
    },
    _buildCustomStore: function(data,fields){
        return Ext.create('Rally.data.custom.Store',{
            fields: fields,
            data: data
        });
    },
    _loadProjects: function() {
        var deffered=Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store', {
            model: 'project',
            autoLoad: true,
            fetch: ['Name', 'ObjectID','c_BuildingBlock','Parent'],
            listeners: {
                load: function(store, data, success) {
                    console.log("projects loaded",data);
                    if (success) {
                        deffered.resolve(data);
                    } else {
                        deffered.reject("Failed to load projects");
                    }
                }
            }
        });
        return deffered.promise;
    },
    _loadSubFeatureRollup: function(){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store',{
            model: this.subfeatureTypePath,
            fetch: ['Parent','ObjectID','c_TeamSprints'],
            limit: 'Infinity',
            context: {
                project: null
            },
            filters: [{
                property: 'Parent.ObjectID',
                operator: '>',
                value: 0
            }]
        }).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    var hash = {};
                    Ext.Array.each(records, function(r){
                        var parent = r.get('Parent') && r.get('Parent').ObjectID;
                        if (parent){
                            if (!hash[parent]){
                                hash[parent] = 0;
                            }
                            hash[parent] += r.get('c_TeamSprints') || 0;
                        }
                    });
                    deferred.resolve(hash);
                } else {
                    deferred.reject(operation.error.errors.join)(',');
                }
            },
            scope: this
        });

        return deferred;
    },
    _buildStore: function(){
        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: this._getModels(),
            fetch:['ObjectID','Name','Project','c_TeamSprints','PlannedStartDate','PlannedEndDate','c_ProjectType','Children'],
            enableHierarchy: true,
            autoLoad: true
        }).then({
            success: this._createTreeGrid,
            scope: this
        });
    },
    _getModels: function(){
        return ['portfolioitem/marketablefeature'];
    },
    _updateData: function(store){

        console.log('_updateData', store, store.tree.root);
        var records = store.tree.root.childNodes;

        if (records.length > 0){
            Ext.Array.each(records, function(r){
                if (r.get('Children') && r.get('Children').Count > 0){
                    r.getCollection('Children').load({
                        callback: function(children, operation){
                            console.log('collectionLoad', children, operation);
                            var vals = _.map(children, function(r){ return r.get('c_TeamSprints') || 0;});
                            r.set('c_TeamSprints', Ext.Array.sum(vals));

                        }
                    });
                }

            });
        }


    },
    _createTreeGrid: function(store){
        //console.log("in _createTreeGrid");
        //If we don't destroy a grid that already exists, then a duplicate grid will
        //be created.
        if (this.down('rallygridboard')){
            this.down('rallygridboard').destroy();
        }

        store.on('load', this._updateData, this);
        store.on('datachanged', this._updateData, this);

        var me = this;

        //Adding grid board
        this.add({
            xtype: 'rallygridboard',
            context: this.getContext(),
            modelNames: this._getModels(),
            toggleState: 'grid',
            plugins: [{
                ptype: 'rallygridboardcustomfiltercontrol',
                filterControlConfig: {
                    modelNames: this._getModels(),
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('planning-custom-filter')
                },
                showOwnerFilter: true,
                ownerFilterControlConfig: {
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('planning-owner-filter')
                }
            }],
            stateId: 'blah',
            gridConfig: {
                store: store,
                storeConfig: {
                    pageSize: 200
                },
                enableBulkEdit: true,

                columnCfgs: this._getColumnConfig(),
                bulkEditConfig: {
                    items: [{
                        xtype: 'examplebulkrecordmenuitem'
                    }]
                },
                rowActionColumnConfig: {
                    listeners: {
                        scope: this,
                        success: function() {
                            console.log('success grid');

                        },
                        error: function(operations) {
                            this.fireEvent('error',operations);
                        }
                    },
                    menuOptions: {
                        teamData: this.teamData,
                        teamFields: this.teamFields,
                        subFeatureModel: this.subFeatureModel,
                        onSuccess: function(record){
                            // console.log('onSuccess', record);
                            Rally.ui.notify.Notifier.show({message: "All Sub Features Created"});
                            var grid=me.down('rallygridboard');
                            if (grid && grid.getGridOrBoard()) {
                                grid.getGridOrBoard().getStore().reload();
                            }
                        },
                        onError: function(operation){
                            Rally.ui.notify.Notifier.showError({message: "Error:  " + operation.error.errors.join(',')});
                        }

                    }
                }
            },
            height: this.getHeight()
        });

    },
    _getColumnConfig: function() {
        return [
            'Name',
            'Project',
            {
                dataIndex: 'c_TeamSprints',
                text: 'Team Sprints',
                renderer: this.getTeamSprintRenderer
            },
            'PlannedStartDate',
            'PlannedEndDate'
        ];
    },
    getTeamSprintRenderer: function(value,metaData,record) {
        return value;
    }
});

