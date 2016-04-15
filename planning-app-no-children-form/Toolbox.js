Ext.define('Toolbox',{
    singleton: true,

    loadProjects: function(fetchList){
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store',{
            model: 'Project',
            fetch: fetchList,
            limit: 'Infinity'
        }).load({
            callback: function(records, operation){
                deferred.resolve(records);
            }
        });
        return deferred;
    },
    getModelObject: function(name) {
        var deffered=Ext.create('Deft.Deferred');
        Rally.data.ModelFactory.getModel({
            type: name,
            success: function(model) {
                deffered.resolve(model);
            }
        });
        return deffered.promise;
    },
    buildProjectPinBuildingBlockData: function(records, fieldName){
        var hashByObjectID = Toolbox.buildHashByField(records, 'ObjectID'),
            pins = _.map(_.filter(records, function(r){return (/^TECHNOLOGY AREA/).test(r.get('Name')); }),
                function(r){
                    return r.get('ObjectID');
                });

        var projectsWithBuildingBlocks = Ext.Array.filter(records, function(record){
            return record.get(fieldName) && record.get(fieldName).length > 0;
        });

        var data = Ext.Array.map(projectsWithBuildingBlocks, function(p){
            var path = Toolbox.getProjectPath(p, hashByObjectID),
                pathNames = Toolbox.getStringPath(path, hashByObjectID),
                pin = _.intersect(pins, path);

            return {
                Name: p.get('Name'),
                BuildingBlock: p.get(fieldName),
                ObjectID: p.get('ObjectID'),
                Ancestors: path,
                AncestorNames: pathNames,
                Pin: hashByObjectID[pin]
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
        return stringPath;
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