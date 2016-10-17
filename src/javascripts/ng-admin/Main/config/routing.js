import layoutTemplate from '../view/layout.html';
import dashboardTemplate from '../view/dashboard.html';
import errorTemplate from '../view/404.html';

function dataStoreProvider() {
    return ['AdminDescription', function (AdminDescription) {
        return AdminDescription.getDataStore();
    }];
}

function entryConstructorProvider() {
    return ['AdminDescription', function (AdminDescription) {
        return AdminDescription.getEntryConstructor();
    }];
}

function routing($stateProvider, $urlRouterProvider) {

    $stateProvider.state('ng-admin', {
        abstract: true,
        views: {
            'ng-admin': {
                controller: 'AppController',
                controllerAs: 'appController',
                templateProvider: ['NgAdminConfiguration', function(Configuration) {
                    return Configuration().layout() || layoutTemplate;
                }]
            }
        }
    });

    $stateProvider.state('dashboard', {
        parent: 'ng-admin',
        url: '/dashboard?sortField&sortDir',
        params: {
            sortField: null,
            sortDir: null
        },
        controller: 'DashboardController',
        controllerAs: 'dashboardController',
        templateProvider: ['NgAdminConfiguration', function(Configuration) {
            return Configuration().dashboard().template() || dashboardTemplate;
        }],
        resolve: {
            dataStore: dataStoreProvider(),
            Entry: entryConstructorProvider(),
            hasEntities: ['NgAdminConfiguration', function(Configuration) {
                return Configuration().entities.length > 0;
            }],
            collections: ['NgAdminConfiguration', function(Configuration) {
                return Configuration().dashboard().collections();
            }],
            responses: ['$stateParams', '$q', 'collections', 'dataStore', 'Entry', 'ReadQueries', function($stateParams, $q, collections, dataStore, Entry, ReadQueries) {
                var sortField = 'sortField' in $stateParams ? $stateParams.sortField : null;
                var sortDir = 'sortDir' in $stateParams ? $stateParams.sortDir : null;

                var promises = {},
                    collection,
                    collectionSortField,
                    collectionSortDir,
                    collectionName;

                for (collectionName in collections) {
                    collection = collections[collectionName];
                    collectionSortField = collection.getSortFieldName();
                    collectionSortDir = collection.sortDir();
                    if (sortField && sortField.split('.')[0] === collection.name()) {
                        collectionSortField = sortField;
                        collectionSortDir = sortDir;
                    }
                    promises[collectionName] = (function (collection, collectionSortField, collectionSortDir) {
                        var rawEntries;

                        return ReadQueries
                            .getAll(collection, 1, {}, collectionSortField, collectionSortDir)
                            .then(response => {
                                rawEntries = response.data;
                                return rawEntries;
                            })
                            .then(rawEntries => ReadQueries.getReferenceData(collection.fields(), rawEntries))
                            .then(referenceData => {
                                const references = collection.getReferences();
                                for (var name in referenceData) {
                                    Entry.createArrayFromRest(
                                        referenceData[name],
                                        [references[name].targetField()],
                                        references[name].targetEntity().name(),
                                        references[name].targetEntity().identifier().name()
                                    ).map(entry => dataStore.addEntry(references[name].targetEntity().uniqueId + '_values', entry));
                                }
                            })
                            .then(() => {
                                var entries = collection.mapEntries(rawEntries);

                                // shortcut to display collection of entry with included referenced values
                                dataStore.fillReferencesValuesFromCollection(entries, collection.getReferences(), true);

                                return entries;
                            });
                    })(collection, collectionSortField, collectionSortDir);
                }

                return $q.all(promises);
            }],
            entries: ['responses', 'collections', function(responses, collections) {
                var collectionName,
                    entries = {};

                for (collectionName in responses) {
                    entries[collections[collectionName].name()] = responses[collectionName];
                }

                return entries;
            }]
        }
    });

    $stateProvider.state('ma-404', {
        parent: 'ng-admin',
        template: errorTemplate
    });

// custom app with special paths and no dashboard as a default
//    $urlRouterProvider.when('', '/dashboard');
    $urlRouterProvider.when('', ['$location','$document',function($location,$document) {
        if($location.absUrl().indexOf('O0104F01') !== -1 || $document[0].title.indexOf('Person in charge information') !== -1 || $document[0].title.indexOf('担当者マスタメンテナンス') !== -1) {
            return '/m_pic/list';
        } else if($location.absUrl().indexOf('O0106F01') !== -1 || $document[0].title.indexOf('Subsidy information') !== -1 || $document[0].title.indexOf('補助金種別マスタメンテナンス') !== -1) {
            return '/m_subsidy_type/list';
        } else if($location.absUrl().indexOf('O0110F01') !== -1 || $document[0].title.indexOf('Tag information') !== -1 || $document[0].title.indexOf('タグマスタメンテナンス') !== -1) {
            return '/m_tag/list';
        } else if($location.absUrl().indexOf('O0109F01') !== -1 || $document[0].title.indexOf('Conservation Inspection Job information') !== -1 || $document[0].title.indexOf('保全点検作業マスタメンテナンス') !== -1) {
            return '/m_conservation_inspection_job/list';
        } else if($location.absUrl().indexOf('O0108F01') !== -1 || $document[0].title.indexOf('Conservation Inspection information') !== -1 || $document[0].title.indexOf('保全点検マスタメンテナンス') !== -1) {
            return '/m_conservation_inspection/list';
        } else if($location.absUrl().indexOf('O0105F01') !== -1 || $document[0].title.indexOf('Device information') !== -1 || $document[0].title.indexOf('機器マスタメンテナンス') !== -1) {
            return '/m_device/list';
        } else if($location.absUrl().indexOf('O0107F01') !== -1 || $document[0].title.indexOf('Job information') !== -1 || $document[0].title.indexOf('作業マスタメンテナンス') !== -1) {
            return '/m_job/list';
        }
    }]);


    $urlRouterProvider.otherwise(function($injector, $location) {
        var state = $injector.get('$state');
        state.go('ma-404');
        return $location.path();
    });
}

routing.$inject = ['$stateProvider', '$urlRouterProvider'];

export default routing;
