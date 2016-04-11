Ext.define('Rally.technicalservices.BuildingBlockGrid',{
    extend: 'Ext.grid.Panel',
    alias: 'widget.buildingblockgrid',

    config: {
        linkField: null,
        linkFieldURL: null,
        publishedField: null,
        modelName: null
    },

    columns: [{
        flex: 1,
        dataIndex: 'Name'
    }],

    plugins: [{
        ptype: 'rowexpander',
        rowBodyTpl: new Ext.XTemplate('<p>{Name}</p>{[this.getBuildingBlocks(values)]}',{
            getBuildingBlocks: function(values){
                return Ext.String.format('<br/><span class="building-blocks">Building Blocks go here...</span>');
            }
        })
    }],

    title: 'Loading...',
    hideHeaders: true,
    collapsible: true,
    animCollapse: false,
    collapsed: true,
    width: '100%',
    flex: 1,
    hideCollapseTool: true,
    titleCollapse: true,
    margin: '5 5 5 5',
    scroll: false,
    header: {
        cls: 'feature-header',
        padding: 20
    },

    fetchList: ['FormattedID','Name','Description','State','Archived'],

    constructor: function(config) {
        this.mergeConfig(config);

        this.itemId = 'pnl-' + config.state;

        var filters = [{
            property: 'State.Name',
            value: config.state
        },{
            property: 'Archived',
            value: false
        }];

        if (config.publishedField){
            filters.push({
                property: config.publishedField,
                value: true
            });
        }

        this.findPlugin('rowexpander').rowBodyTpl.linkField = config.linkField;
        this.findPlugin('rowexpander').rowBodyTpl.linkFieldURL = config.linkFieldURL;

        var fetch = this.fetchList.concat([config.linkField, config.publishedField]);
        this.store = Ext.create('Rally.data.wsapi.Store',{
            model: config.modelName,
            fetch: fetch,
            autoLoad: true,
            context: this.context,
            filters: filters,
            listeners: {
                scope: this,
                load: function(store,records,success){
                    this._setTitle(config.label, config.description, store.getTotalCount());
                }
            }
        });

        this.callParent(arguments);
        this.on('expand', this._onExpand, this);
        this.on('collapse', this._onExpand, this);

    },
    _setTitle: function(label, description, recordCount){
        var num_items = recordCount || 0,
            title = Ext.String.format('<span class="feature-header-title">{0}</span><span class="feature-header-description">&nbsp;({1}) {2}</span><div class="control chevron {3}"></div>',label, num_items, description, "icon-chevron-right");
        this.setTitle(title);
    },

    _onExpand: function(){
        var icon_class = this.collapsed ? "icon-chevron-right" : "icon-chevron-down",
            prev_icon_class = this.collapsed ? "icon-chevron-down" : "icon-chevron-right";
        var title = this.getHeader().title.replace(prev_icon_class, icon_class);
        this.suspendLayout = true;
        this.setTitle(title);
        this.suspendLayout = false;
    }
});
