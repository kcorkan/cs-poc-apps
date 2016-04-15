Ext.define('BuildingBlockComponent', {
    extend: 'Ext.container.Container',
    alias: 'widget.buildingblockcomponent',

    layout: {
        type: 'vbox',
        align: 'stretch',
        style: {
            backgroundColor: Rally.util.Colors.grey1
        }
    },

    defaults: {
        flex: 1
    },

    /**
     * @constructor
     * @param {Object} config
     */
    constructor: function (config) {
        this.mergeConfig(config);
        this.callParent([config]);
    },

    initComponent: function () {
        var record = this.record,
            quarters = this.quarters,
            bb = this.record.getFlattenedBuildingBlockObjects(quarters);

        var items = _.map(bb, function(b){

            var subItems = [{
                xtype: 'container',
                flex: 1
            },{
                xtype: 'rallybutton',
                cls: 'rly-small secondary',
                iconCls: 'icon-delete',
                handler: function(){
                    record.removeDemand(b.pin, b.buildingBlock, quarters);
                }
            },{
                xtype: 'container',
                data: b,
                tpl: '<tpl>{pinName} - {buildingBlock}</tpl>',
                flex: 2,
                height: 25,
                cls: 'buildingBlockLabel',
                margin: 5
            }];
            Ext.Array.each(quarters, function(q){

                subItems.push({
                    xtype: 'rallynumberfield',
                    value: b[q],
                    margin: 10,
                    flex: 1,
                    buildingBlock: b,
                    quarter: q,
                    listeners: {
                        blur: function(nb){
                            record.updateDemand(nb.getValue(), q, b.pin, b.buildingBlock);
                        },
                        scope: this
                    }
                });
            });
            subItems.push({
                xtype: 'container',
                flex: 3
            });

            return {
                xtype: 'container',
                layout: 'hbox',
                items: subItems
            };
        }, this);

        this.items = items;
        this.setHeight(35 * bb.length);

        this.callParent(arguments);
    }

});