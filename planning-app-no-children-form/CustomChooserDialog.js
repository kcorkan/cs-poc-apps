//USAGE:
//
// teamData is an array of objects with relevant data attributes (one must be a unique ObjectID)
// teamFields is an array of string fields to display in the grid
//
//
//var dlg = Ext.create('Rally.ui.dialog.CustomChooserDialog',{
//    teamFields: fields,
//    teamData: data,
//    listeners: {
//        itemchosen: function(dlg, selectedTeam){
//            console.log('team chosen', selectedTeam);
//        }
//    }
//});
//dlg.show();

Ext.define('Rally.ui.dialog.CustomChooserDialog', {
    extend: 'Rally.ui.dialog.Dialog',
    alias: 'widget.customchooserdialog',

    height: 400,
    width: 600,
    layout: 'fit',
    closable: true,
    draggable: true,

    config: {
        /**
         * @cfg {String}
         * Title to give to the dialog
         */
        title: 'Choose an Item',

        /*
         * teamData is an array of objects with relevant data.  At least one of hte properties must be a unique object id
         *
         */
        teamData: [],
        /*
         * teamFields is the fields to display
         */
        teamFields: [],

        /**
         * @cfg {Boolean}
         * Allow multiple selection or not
         */
        multiple: true,

        /**
         * @cfg {Ext.grid.Column}
         * List of columns that will be used in the chooser
         */
        columns: [
            {
                text: 'Building Block',
                dataIndex: 'buildingBlock',
                flex: 1,
                renderer: function(v,m,r){
                    return r.get('pinName') + ' - ' + r.get('buildingBlock');
                }
            }
        ],

        /**
         * @cfg {String}
         * Text to be displayed on the button when selection is complete
         */
        selectionButtonText: 'Done',

        /**
         * @cfg {Object}
         * The grid configuration to be used when creative the grid of items in the dialog
         */
        gridConfig: {},

        /**
         * @deprecated
         * @cfg {String}
         * The ref of a record to select when the chooser loads
         * Use selectedRecords instead
         */
        selectedRef: undefined,

        /**
         * @cfg {String}|{String[]}
         * The ref(s) of items which should be selected when the chooser loads
         */
        selectedRecords: undefined,

        /**
         * @cfg {Array}
         * The records to select when the chooser loads
         */
        initialSelectedRecords: undefined,

        /**
         * @private
         * @cfg userAction {String} (Optional)
         * The client metrics action to record when the user makes a selection and clicks done
         */

        /**
         * @cfg showRadioButtons {Boolean}
         */
        showRadioButtons: true
    },

    constructor: function(config) {
        this.mergeConfig(config);

        this.callParent([this.config]);
    },

    selectionCache: [],

    initComponent: function() {
        this.callParent(arguments);

        this.addEvents(
            /**
             * @event artifactchosen
             * Fires when user clicks done after choosing an artifact
             * @param {Rally.ui.dialog.ArtifactChooserDialog} source the dialog
             * @param {Rally.data.wsapi.Model}| {Rally.data.wsapi.Model[]} selection selected record or an array of selected records if multiple is true
             */
            'itemchosen'
        );

        this.addCls(['chooserDialog', 'chooser-dialog']);
    },

    destroy: function() {
        this._destroyTooltip();
        this.callParent(arguments);
    },

    beforeRender: function() {
        this.callParent(arguments);

        this.addDocked({
            xtype: 'toolbar',
            dock: 'bottom',
            padding: '0 0 10 0',
            layout: {
                type: 'hbox',
                pack: 'center'
            },
            ui: 'footer',
            items: [
                {
                    xtype: 'rallybutton',
                    itemId: 'doneButton',
                    text: this.selectionButtonText,
                    cls: 'primary rly-small',
                    scope: this,
                    disabled: true,
                    userAction: 'clicked done in dialog',
                    handler: function() {
                        this.fireEvent('itemchosen', this, this.getSelectedRecords());
                        this.close();
                    }
                },
                {
                    xtype: 'rallybutton',
                    text: 'Cancel',
                    cls: 'secondary rly-small',
                    handler: this.close,
                    scope: this,
                    ui: 'link'
                }
            ]
        });

        if (this.introText) {
            this.addDocked({
                xtype: 'component',
                componentCls: 'intro-panel',
                html: this.introText
            });
        }

        this.addDocked({
            xtype: 'toolbar',
            itemId: 'searchBar',
            dock: 'top',
            border: false,
            padding: '0 0 10px 0',
            items: this.getSearchBarItems()
        });

        this.buildGrid();

        this.selectionCache = this.getInitialSelectedRecords() || [];
    },

    /**
     * Get the records currently selected in the dialog
     * {Rally.data.Model}|{Rally.data.Model[]}
     */
    getSelectedRecords: function() {
        return this.multiple ? this.selectionCache : this.selectionCache[0];
    },

    getSearchBarItems: function() {
        return [
            {
                xtype: 'triggerfield',
                cls: 'rui-triggerfield chooser-search-terms',
                emptyText: 'Search Keyword or ID',
                enableKeyEvents: true,
                flex: 1,
                itemId: 'searchTerms',
                listeners: {
                    keyup: function (textField, event) {
                        if (event.getKey() === Ext.EventObject.ENTER) {
                            this._search();
                        }
                    },
                    afterrender: function (field) {
                        field.focus();
                    },
                    scope: this
                },
                triggerBaseCls: 'icon-search chooser-search-icon'
            }
        ];
    },

    getStoreFilters: function() {
        return [];
    },

    _getProjectDataStore: function(){
        console.log('this',this.teamData, this.teamFields);
        var data = this.teamData;
        return Ext.create('Rally.data.custom.Store',{
            data: data,
            fields: this.teamFields,
            pageSize: data.length,
            remoteFilter: false //we need this for the filtering
        });
    },

    buildGrid: function() {
        if (this.grid) {
            this.grid.destroy();
        }

        var projectDataStore = this._getProjectDataStore();

        var selectionConfig = {
            mode: this.multiple ? 'SIMPLE' : 'SINGLE',
            allowDeselect: true
        };
        this.grid = Ext.create('Rally.ui.grid.Grid', Ext.Object.merge({
            columnCfgs: this.columns,
            enableEditing: false,
            enableColumnHide: false,
            enableColumnMove: false,
            selModel: this.showRadioButtons || this.multiple ? Ext.create('Rally.ui.selection.CheckboxModel', Ext.apply(selectionConfig, {
                enableKeyNav: false,
                isRowSelectable: function (record) {
                    return true;
                }
            })) : Ext.create('Ext.selection.RowModel', selectionConfig),
            showRowActionsColumn: false,
            store: projectDataStore,
            viewConfig: {
                emptyText: Rally.ui.EmptyTextFactory.get('defaultText'),
                publishLoadMessages: false,
                getRowClass: function (record) {
                    return Rally.util.Test.toBrowserTestCssClass('row', record.getId());
                }
            }
        }, this.config.gridConfig));
        this.mon(this.grid, {
            beforeselect: this._onGridSelect,
            beforedeselect: this._onGridDeselect,
            load: this._onGridLoad,
            scope: this
        });
        this.add(this.grid);
        this._onGridReady();
    },

    _addTooltip: function() {
        this._destroyTooltip();
        this.tooltip = Ext.create('Rally.ui.tooltip.ToolTip', {
            target: this.grid.getEl(),
            html: 'You don\'t have permission to edit this item.',
            delegate: '.disabled-row',
            anchor: 'top',
            showDelay: 0,
            showOnClick: true
        });
    },

    _destroyTooltip: function() {
        if (this.tooltip) {
            this.tooltip.destroy();
        }
    },

    _getStoreConfig: function() {
        var storeConfig = _.cloneDeep(this.getInitialConfig().storeConfig);

        if (this._getSearchTerms()) {
            storeConfig.search = this._getSearchTerms();
        }

        storeConfig.filters = (storeConfig.filters || []).concat(this.getStoreFilters());

        return storeConfig;
    },

    _enableDoneButton: function() {
        this.down('#doneButton').setDisabled(this.selectionCache.length ? false : true);
    },

    _findRecordInSelectionCache: function(record){
        return _.findIndex(this.selectionCache, function(cachedRecord) {
            return cachedRecord.get('pin') === record.get('pin') &&
                cachedRecord.get('buildingBlock') === record.get('buildingBlock');
        });
    },

    _onGridSelect: function(selectionModel, record) {

        var index = this._findRecordInSelectionCache(record);
        if (index === -1) {
            if (!this.multiple) {
                this.selectionCache = [];
            }
            this.selectionCache.push(record);
        }
        this._enableDoneButton();
    },

    _onGridDeselect: function(selectionModel, record) {
        var index = this._findRecordInSelectionCache(record);
        if (index !== -1) {
            this.selectionCache.splice(index, 1);
        }

        this._enableDoneButton();
    },

    _onGridReady: function() {
        if (!this.grid.rendered) {
            this.mon(this.grid, 'afterrender', this._onGridReady, this, {single: true});
            return;
        }

        if (this.grid.getStore().isLoading()) {
            this.mon(this.grid, 'load', this._onGridReady, this, {single: true});
            return;
        }

        this._onGridLoad();
        this.center();
    },

    _isArtifactEditable: function(record) {
        return Rally.environment.getContext().getPermissions().isProjectEditor(record.get('Project'));
    },

    _onGridLoad: function() {
        var defaultSelection = Ext.Array.from(this.selectedRef || this.selectedRecords);
        if (defaultSelection.length) {
            var selectedRecords = _.compact(_.map(defaultSelection, function(ref) {
                var recordIndex = this.grid.getStore().find('_ref', ref);
                return recordIndex >= 0 ? this.grid.getStore().getAt(recordIndex) : null;
            }, this));
            if(selectedRecords.length) {
                this.grid.getSelectionModel().select(selectedRecords);
            }
        } else {
            var store = this.grid.store;
            var records = [];

            _.each(this.selectionCache, function(record) {
                var recordIndex = store.find('_ref', record.get('_ref'));

                if (recordIndex !== -1) {
                    var storeRecord = store.getAt(recordIndex);
                    records.push(storeRecord);
                }
            });

            if (records.length) {
                this.grid.getSelectionModel().select(records);
            }
        }

        this._addTooltip();
        if (Rally.BrowserTest) {
            Rally.BrowserTest.publishComponentReady(this);
        }
    },

    _search: function() {
        var terms = new RegExp(this._getSearchTerms(), "gi");
        this.grid.getStore().filterBy(function(record){

            if (!terms){
                return true;
            }

            return terms.test(record.get('Name')) ||
                terms.test(record.get('Path')) ||
                terms.test(record.get('c_BuildingBlock'));
        });
    },

    _getSearchTerms: function() {
        var textBox = this.down('#searchTerms');
        return textBox && textBox.getValue();
    }
});
