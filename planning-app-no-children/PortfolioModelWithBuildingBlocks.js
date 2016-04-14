Ext.define('BuildingBlock', {
    extend: 'Ext.data.Model',
    fields: ['ordinal', 'team','type','name','amount'],
    belongsTo: 'PortfolioModelWithBuildingBlocks'
});

Ext.define('ExtendedModelBuilder',{
    singleton: true,

    build: function(modelType, newModelName) {
        var deferred = Ext.create('Deft.Deferred');

        Rally.data.ModelFactory.getModel({
            type: modelType,
            success: function(model) {

                var default_fields = [{
                    name: 'children',
                    convert: function(value, record){
                        return record._getBuildingBlockObjects();
                    }
                },{
                    name: 'text',
                    convert: function(value, record){
                        return record.get('FormattedID');
                    }
                }];
                var new_model = Ext.define(newModelName, {
                    extend: model,
                    fields: default_fields,
                    buildingBlockField: 'c_RequestedPins',
                    /**
                     * appends building block data to the record's building blocks
                     * @param selectedTeams
                     */
                    appendBuildingBlock: function(bbs){
                        var buildingBlocks = this._getBuildingBlockObjects();
                        //This assumes that building blocks will be unique.  If they are not, then we need to add them
                        Ext.Array.each(bbs, function(bb){
                            buildingBlocks.push(bb);
                        });
                        this._setBuildingBlockObjects(buildingBlocks);
                    },
                    /**
                     * private functions to encode and decode the JSON that is stored in the text field or external data source
                     *
                     * @returns {*}
                     * @private
                     *
                     * Expected JSON format:
                     *  [{
                     *      pin: <project ObjectID of assigned pin>,
                     *      pinName: <project Name of assigned pin>,
                     *      buildingBlock: <building block name>,
                     *      quarter: <quarter name>,
                     *      demand: <demand>
                     *   },{
                     *      ...
                     *   }]
                     *
                     */
                    _getBuildingBlockObjects: function(){
                        var objects =  Ext.JSON.decode(this.get(this.buildingBlockField) || "[]");

                        //post-load data manipulation  here - need to transform the normalized JSON into
                        //rows that can be displayed in a grid.
                        //Also need to add same fields as parent
                        Ext.Array.each(objects, function(o){
                            o.children=null;
                            o.text = o.pinName + ' - ' + o.buildingBlock;
                        });

                        return objects;
                    },
                    _setBuildingBlockObjects: function(buildingBlocks){

                        //pre-save data manipulation here - need to transform the flattened rows into
                        //normalized object to save as JSON

                        this.set(this.buildingBlockField, Ext.JSON.encode(buildingBlocks || []));
                        this.save();
                    },
                    /**
                     * updateBuildingBlocks updates the building blocks to either the internal text field
                     * or eventually to an external data source
                     * @param bbs
                     *
                     * In this method we need to:
                     *   -- not overwrite building blocks that aren't in the quarters we are interested in
                     *   -- remove building blocks that we may have deleted from the UI
                     *   -- add building blocks that we may have added to the UI
                     */
                    updateBuildingBlocks: function(bbs){
                        //For this function, we need to make sure we:
                        //  --> don't overwrite any building blocks in other quarters and
                        this._setBuildingBlockObjects(bbs);
                    },
                    getDemand: function(quarter, pin){
                        var buildingBlocks = this._getBuildingBlockObjects(),
                            demand = 0;

                        Ext.Array.each(buildingBlocks, function(bb){
                            if (bb.quarter === quarter){
                                console.log('pin',pin,bb);
                                if (pin){
                                    if (Number(bb.pin) === pin) {
                                        demand += bb.demand;
                                    }
                                } else {
                                    demand += bb.demand;
                                }

                            }
                        });
                        return demand;
                    }

                });
                deferred.resolve(new_model);
            },
            save: function(options){
                //add any pre save manipulations here
                return callParent(options);
            }
        });
        return deferred;
    }
});