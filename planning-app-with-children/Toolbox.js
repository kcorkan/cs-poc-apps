Ext.define('Toolbox',{
    singleton: true,

    loadProjects: function(customFilterField){
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store',{
            model: 'Project',
            fetch: ['ObjectID','Name','Parent',customFilterField],
            limit: 'Infinity'
        }).load({
            callback: function(records, operation){
                var data = Toolbox.buildCustomProjectData(records,customFilterField);



                deferred.resolve(data);
            }
        });
        return deferred;
    },

    buildFieldAttributeStore: function(records, fieldName){
        var hashByObjectID = Toolbox.buildHashByField(records, 'ObjectID');

        var projectsWithBuildingBlocks = Ext.Array.filter(records, function(record){
            return record.get(customField) && record.get(customField).length > 0;
        });

        var data = Ext.Array.map(projectsWithBuildingBlocks, function(p){
            var path = Toolbox.getProjectPath(p, hashByObjectID),
                stringPath = Toolbox.getStringPath(path, hashByObjectID);
            return {
                Name: p.get('Name'),
                BuildingBlock: p.get(customField),
                ObjectID: p.get('ObjectID'),
                Path: stringPath,
                Ancestors: path
            };
        });
        return data;
    },
    buildHashByField: function(records, field){
        var hash = {};
        Ext.Array.each(records, function(record){
            hash[record.get(field)] = record;
        });
        return hash;
    },

    buildCustomProjectData: function(records,customField){
        var hashByObjectID = Toolbox.buildHashByField(records, 'ObjectID');

        var projectsWithBuildingBlocks = Ext.Array.filter(records, function(record){
            return record.get(customField) && record.get(customField).length > 0;
        });

        var data = Ext.Array.map(projectsWithBuildingBlocks, function(p){
            var path = Toolbox.getProjectPath(p, hashByObjectID),
                stringPath = Toolbox.getStringPath(path, hashByObjectID);
            return {
                Name: p.get('Name'),
                BuildingBlock: p.get(customField),
                ObjectID: p.get('ObjectID'),
                Path: stringPath,
                Ancestors: path
            };
        });
        return data;
    },
    getStringPath: function(path, hashByObjectID){
        var stringPath = _.map(path, function(p){ return hashByObjectID[p].get('Name') || "--"; });
        return stringPath.join('/');
    },
    getProjectPath: function(projectRecord, projectHashByObjectID){
        var parent = projectRecord.get('Parent') && projectRecord.get('Parent').ObjectID,
            path = [projectRecord.get('ObjectID')];

        while (parent){
            var parentRecord = projectHashByObjectID[parent];
            if (parentRecord){
                path.unshift(projectHashByObjectID[parent].get('ObjectID'));
                parent = parentRecord.get('Parent') && parentRecord.get('Parent').ObjectID;
            } else {
                parent = null;
            }
        }
        return path;
    }
});