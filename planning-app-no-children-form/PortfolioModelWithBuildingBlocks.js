Ext.define('BuildingBlock', {
    extend: 'Ext.data.Model',
    fields: ['ordinal', 'team','type','name','amount'],
    belongsTo: 'PortfolioModelWithBuildingBlocks'
});

Ext.define('ExtendedModelBuilder',{
    singleton: true,

    build: function(modelType, newModelName, context) {
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
                },{
                    name: '__demand',
                    defaultValue: '--'
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

                        //If the building block already exists, then it won't be appended.
                        Ext.Array.each(bbs, function(bb){
                            var existingBB = Ext.Array.filter(buildingBlocks, function(b){
                                return b.pin === bb.pin && b.quarter === bb.quarter && b.buildingBlock === bb.buildingBlock;
                            });
                            if (!existingBB || existingBB.length === 0 ){
                                buildingBlocks.push(bb);
                            }
                        });
                        this._setBuildingBlockObjects(buildingBlocks);
                    },
                    getFlattenedBuildingBlockObjects: function(quarters){
                        var buildingBlocks = this._getBuildingBlockObjects(),
                            hash = {};

                        Ext.Array.each(buildingBlocks, function(bb){
                            var key = bb.pin + "|" + bb.buildingBlock;
                            if (!hash[key]){
                                hash[key] = {
                                        pin: bb.pin,
                                        pinName: bb.pinName,
                                        buildingBlock: bb.buildingBlock
                                    };
                                Ext.Array.each(quarters, function(q){
                                    hash[key][q] = 0;
                                });
                            }
                            if (Ext.Array.contains(quarters, bb.quarter)){
                                hash[key][bb.quarter] = bb.demand || 0;
                            }
                        });
                        return _.values(hash);
                    },
                    updateDemand: function(demand, quarter, pin, buildingBlock){
                        var bbs = this._getBuildingBlockObjects(),
                            updatedBuildingBlocks = [];
                        Ext.Array.each(bbs, function(b){
                            if (b.quarter === quarter && b.pin === pin && b.buildingBlock === buildingBlock){
                                b.demand = demand;
                            }
                            updatedBuildingBlocks.push(b);
                        });

                        this._setBuildingBlockObjects(updatedBuildingBlocks);
                    },
                    removeDemand: function(pin, buildingBlock, quarters){
                         var bbs = this._getBuildingBlockObjects(),
                            updatedBuildingBlocks = Ext.Array.filter(bbs, function(b){
                                var match = b.pin === pin && b.buildingBlock === buildingBlock &&
                                        Ext.Array.contains(quarters, b.quarter);
                                return !match;
                            });
                        this._setBuildingBlockObjects(updatedBuildingBlocks);
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

                        //post-load data manipulation  here, if needed.

                        return objects;
                    },
                    _setBuildingBlockObjects: function(buildingBlocks){

                        //pre-save data manipulation here - need to transform the flattened rows into
                        //normalized object to save as JSON, if needed.

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