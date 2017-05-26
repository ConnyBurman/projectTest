'use strict';

app.homeView = kendo.observable({
    onShow: function() {},
    afterShow: function() {}
});
app.localization.registerView('homeView');

// START_CUSTOM_CODE_homeView
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes
(function() {
    app.homeView.set('title', 'Home');
})();
// END_CUSTOM_CODE_homeView
(function(parent) {
    var dataProvider = app.data.backendServices,
        /// start global model properties

        processImage = function(img) {

            function isAbsolute(img) {
                if  (img && img.match(/http:\/\/|https:\/\/|data:|\/\//g)) {
                    return true;
                }
                return false;
            }

            if (!img) {
                var empty1x1png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=';
                img = 'data:image/png;base64,' + empty1x1png;
            } else if (typeof img === 'string' && !isAbsolute(img)) {
                var setup = dataProvider.setup || {};
                img = setup.scheme + ':' + setup.url + setup.appId + '/Files/' + img + '/Download';
            }

            return img;
        },

        markerLayers = {},
        getLocation = function(options) {
            var d = new $.Deferred();
            if (options === undefined) {
                options = {
                    enableHighAccuracy: true
                };
            }
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    d.resolve(position);
                },
                function(error) {
                    d.reject(error);
                },
                options);
            return d.promise();
        },

        getDistance = function(data, callback) {
            getLocation()
                .then(function(userPosition) {
                    var position = L.latLng(userPosition.coords.latitude, userPosition.coords.longitude),
                        markerPosition = L.latLng(data.latitude, data.longitude),
                        distance;
                    distance = Math.round(position.distanceTo(markerPosition));
                    if (distance > 1000) {
                        distance /= 1000;
                        distance += " km";
                    } else {
                        distance += " m";
                    }
                    callback(distance);
                });
        },

        setupMap = function(container, dataModel, markersLayer) {
            var markersLayerContainer = container + 'markersLayer';
            if (homeViewModel[container]) {
                homeViewModel[container].remove();
                homeViewModel[container] = null;
            }
            homeViewModel[container] = L.map(container);
            homeViewModel[markersLayerContainer] = new L.FeatureGroup();
            var tileLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                id: 'mapbox.streets',
                accessToken: "pk.eyJ1IjoiMjAxNGlkMDAwMSIsImEiOiJjajM1ZjdrZmcwMDU4MzJzMjVwMWZmdGZ2In0.wQ32HhFCoCqbimWXU1x0wA"
            });
            homeViewModel[container].addLayer(tileLayer);
            homeViewModel[container].addLayer(homeViewModel[markersLayerContainer]);
            homeViewModel[container].on('click', function(e) {
                homeViewModel.set("itemDetailsVisible", false);
            });
            addMarkers(container, dataModel, markersLayer);
        },
        addMarkers = function(container, data, markersLayer) {
            var markersLayerContainer = container + 'markersLayer';
            getLocation()
                .then(function(userPosition) {
                    var marker,
                        currentMarker, currentMarkerIcon,
                        latLang,
                        mapBounds,
                        userLatLang = L.latLng(userPosition.coords.latitude, userPosition.coords.longitude);
                    homeViewModel[container].setView(userLatLang, 15, {
                        animate: false
                    });
                    mapBounds = homeViewModel[container].getBounds();
                    homeViewModel[markersLayerContainer].clearLayers();
                    if (!markersLayer) {
                        if (data) {
                            if (data.hasOwnProperty('latitude') && data.hasOwnProperty('longitude')) {
                                latLang = [data.latitude, data.longitude];
                            } else if (data.hasOwnProperty('Latitude') && data.hasOwnProperty('Longitude')) {
                                latLang = [data.Latitude, data.Longitude];
                            }
                            if (latLang && latLang[0] !== undefined && latLang[1] !== undefined) {
                                marker = L.marker(latLang, {
                                    clickable: false
                                });
                                homeViewModel[markersLayerContainer + 'Marker'] = latLang;
                                mapBounds.extend(latLang);
                                homeViewModel[markersLayerContainer].addLayer(marker);
                            }
                        } else { //When no data => add form
                            marker = L.marker(userLatLang, {
                                draggable: false
                            });
                            homeViewModel[markersLayerContainer].addLayer(marker);
                            homeViewModel[markersLayerContainer + 'Marker'] = [userLatLang.lat, userLatLang.lng];
                        }
                    } else {
                        if (!homeViewModel[markersLayer + 'markersLayerMarker']) {
                            homeViewModel[markersLayer + 'markersLayerMarker'] = userLatLang;
                        }
                        marker = L.marker(homeViewModel[markersLayer + 'markersLayerMarker'], {
                            draggable: true,
                        });
                        marker.on('dragend', function(e) {
                            var selectedPosition = e.target.getLatLng();
                            setupMap(markersLayer, {
                                longitude: selectedPosition.lng,
                                latitude: selectedPosition.lat
                            });
                        });
                        homeViewModel[markersLayerContainer].addLayer(marker);
                    }
                    currentMarkerIcon = L.divIcon({
                        className: 'current-marker',
                        iconSize: [20, 20],
                        iconAnchor: [20, 20]
                    });
                    currentMarker = L.marker(userLatLang, {
                        icon: currentMarkerIcon
                    });
                    homeViewModel[markersLayerContainer].addLayer(currentMarker);
                    homeViewModel.set("mapVisble", true);
                    homeViewModel[container].invalidateSize({
                        reset: true
                    });
                    homeViewModel[container].fitBounds(mapBounds, {
                        padding: [20, 20]
                    });
                    app.mobileApp.pane.loader.hide();
                })
                .then(null, function(error) {
                    app.mobileApp.pane.loader.hide();
                    alert("code: " + error.code + "message: " + error.message);
                });
        },
        /// end global model properties

        fetchFilteredData = function(paramFilter, searchFilter) {
            var model = parent.get('homeViewModel'),
                dataSource;

            if (model) {
                dataSource = model.get('dataSource');
            } else {
                parent.set('homeViewModel_delayedFetch', paramFilter || null);
                return;
            }

            if (paramFilter) {
                model.set('paramFilter', paramFilter);
            } else {
                model.set('paramFilter', undefined);
            }

            if (paramFilter && searchFilter) {
                dataSource.filter({
                    logic: 'and',
                    filters: [paramFilter, searchFilter]
                });
            } else if (paramFilter || searchFilter) {
                dataSource.filter(paramFilter || searchFilter);
            } else {
                dataSource.filter({});
            }
        },

        flattenLocationProperties = function(dataItem) {
            var propName, propValue,
                isLocation = function(value) {
                    return propValue && typeof propValue === 'object' &&
                        propValue.longitude && propValue.latitude;
                };

            for (propName in dataItem) {
                if (dataItem.hasOwnProperty(propName)) {
                    propValue = dataItem[propName];
                    if (isLocation(propValue)) {
                        dataItem[propName] =
                            kendo.format('Latitude: {0}, Longitude: {1}',
                                propValue.latitude, propValue.longitude);
                    }
                }
            }
        },
        getLocation = function(options) {
            var d = new $.Deferred();

            if (options === undefined) {
                options = {
                    enableHighAccuracy: true
                };
            }

            navigator.geolocation.getCurrentPosition(
                function(position) {
                    d.resolve(position);
                },
                function(error) {
                    d.reject(error);
                },
                options);

            return d.promise();
        },
        defaultMapContainer = 'homeViewModelMap',
        setupMapView = function(container) {
            if (!homeViewModel.map) {
                if (typeof container !== 'string') {
                    container = defaultMapContainer;
                }
                homeViewModel.map = L.map(container);
                homeViewModel.markersLayer = new L.FeatureGroup();

                var tileLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                    attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                    id: 'mapbox.streets',
                    accessToken: 'pk.eyJ1IjoiMjAxNGlkMDAwMSIsImEiOiJjajM1ZjdrZmcwMDU4MzJzMjVwMWZmdGZ2In0.wQ32HhFCoCqbimWXU1x0wA'
                });

                homeViewModel.map.addLayer(tileLayer);

                homeViewModel.map.addLayer(homeViewModel.markersLayer);
                homeViewModel.map.on('click', function(e) {
                    homeViewModel.set('itemDetailsVisible', false);
                });

                homeViewModel.markersLayer.on('click', function(e) {
                    var marker, newItem;

                    marker = e.layer;
                    if (marker.options.icon.options.className.indexOf('current-marker') >= 0) {
                        return;
                    }

                    newItem = homeViewModel.setCurrentItemByUid(marker.options.uid);
                    homeViewModel.set('itemDetailsVisible', true);
                });
                addMarkersView();
            }
        },
        addMarkersView = function() {
            getLocation()
                .then(function(userPosition) {
                    var marker,
                        currentMarker, currentMarkerIcon,
                        latLang,
                        position,
                        mapBounds,
                        data = homeViewModel.get('dataSource').data(),
                        userLatLang = L.latLng(userPosition.coords.latitude, userPosition.coords.longitude);

                    homeViewModel.map.setView(userLatLang, 15, {
                        animate: false
                    });
                    mapBounds = homeViewModel.map.getBounds();
                    homeViewModel.markersLayer.clearLayers();

                    for (var i = 0; i < data.length; i++) {

                        position = data[i].Description || {};

                        if (position.hasOwnProperty('latitude') && position.hasOwnProperty('longitude')) {
                            latLang = [position.latitude, position.longitude];
                        } else if (position.hasOwnProperty('Latitude') && position.hasOwnProperty('Longitude')) {
                            latLang = [position.Latitude, position.Longitude];
                        } else if (position.length == 2) {
                            latLang = [position[0], position[1]];
                        }

                        if (latLang && latLang[0] && latLang[1] && latLang[0] !== undefined && latLang[1] !== undefined) {
                            marker = L.marker(latLang, {
                                uid: data[i].uid
                            });
                            mapBounds.extend(latLang);
                            homeViewModel.markersLayer.addLayer(marker);
                        }
                    }

                    currentMarkerIcon = L.divIcon({
                        className: 'current-marker',
                        iconSize: [20, 20],
                        iconAnchor: [20, 20]
                    });

                    currentMarker = L.marker(userLatLang, {
                        icon: currentMarkerIcon
                    });

                    homeViewModel.markersLayer.addLayer(currentMarker);

                    homeViewModel.set('mapVisble', true);
                    homeViewModel.map.invalidateSize({
                        reset: true
                    });
                    homeViewModel.map.fitBounds(mapBounds, {
                        padding: [20, 20]
                    });
                    app.mobileApp.pane.loader.hide();
                }, function _getLocationError(error) {
                    app.mobileApp.pane.loader.hide();
                    alert('code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
                });
        },

        dataSourceOptions = {
            type: 'everlive',
            transport: {
                typeName: 'Missions',
                dataProvider: dataProvider
            },
            change: function(e) {
                var data = this.data();
                for (var i = 0; i < data.length; i++) {
                    var dataItem = data[i];

                    dataItem['Image1Url'] =
                        processImage(dataItem['Image1']);

                }

                if (homeViewModel.map) {
                    addMarkersView();
                }

            },
            error: function(e) {
                app.mobileApp.pane.loader.hide();
                if (e.xhr) {
                    var errorText = "";
                    try {
                        errorText = JSON.stringify(e.xhr);
                    } catch (jsonErr) {
                        errorText = e.xhr.responseText || e.xhr.statusText || 'An error has occurred!';
                    }
                    alert(errorText);
                }
            },
            schema: {
                model: {
                    fields: {
                        'Headline': {
                            field: 'Headline',
                            defaultValue: ''
                        },
                        'Description': {
                            field: 'Description',
                            defaultValue: ''
                        },
                        'Image1': {
                            field: 'Image1',
                            defaultValue: ''
                        },
                    }
                }
            },
            serverFiltering: true,

            serverSorting: true,
            sort: {
                field: 'CreatedAt',
                dir: 'asc'
            },

            serverPaging: true,
            pageSize: 50

        },
        /// start data sources
        /// end data sources
        homeViewModel = kendo.observable({
            _dataSourceOptions: dataSourceOptions,
            searchChange: function(e) {
                var searchVal = e.target.value,
                    searchFilter;

                if (searchVal) {
                    searchFilter = {
                        field: 'Description',
                        operator: 'contains',
                        value: searchVal
                    };
                }
                fetchFilteredData(homeViewModel.get('paramFilter'), searchFilter);
            },
            fixHierarchicalData: function(data) {
                var result = {},
                    layout = {};

                $.extend(true, result, data);

                (function removeNulls(obj) {
                    var i, name,
                        names = Object.getOwnPropertyNames(obj);

                    for (i = 0; i < names.length; i++) {
                        name = names[i];

                        if (obj[name] === null) {
                            delete obj[name];
                        } else if ($.type(obj[name]) === 'object') {
                            removeNulls(obj[name]);
                        }
                    }
                })(result);

                (function fix(source, layout) {
                    var i, j, name, srcObj, ltObj, type,
                        names = Object.getOwnPropertyNames(layout);

                    if ($.type(source) !== 'object') {
                        return;
                    }

                    for (i = 0; i < names.length; i++) {
                        name = names[i];
                        srcObj = source[name];
                        ltObj = layout[name];
                        type = $.type(srcObj);

                        if (type === 'undefined' || type === 'null') {
                            source[name] = ltObj;
                        } else {
                            if (srcObj.length > 0) {
                                for (j = 0; j < srcObj.length; j++) {
                                    fix(srcObj[j], ltObj[0]);
                                }
                            } else {
                                fix(srcObj, ltObj);
                            }
                        }
                    }
                })(result, layout);

                return result;
            },
            itemClick: function(e) {
                var dataItem = e.dataItem || homeViewModel.originalItem;

                app.mobileApp.navigate('#components/homeView/details.html?uid=' + dataItem.uid);

            },
            addClick: function() {
                app.mobileApp.navigate('#components/homeView/add.html');
            },
            detailsShow: function(e) {
                var uid = e.view.params.uid,
                    dataSource = homeViewModel.get('dataSource'),
                    itemModel = dataSource.getByUid(uid);

                homeViewModel.setCurrentItemByUid(uid);

                /// start detail form show

                getDistance(itemModel.AcceptedBid, function(value) {
                    homeViewModel.set('getDistance', value);
                });

                /// end detail form show

            },
            setCurrentItemByUid: function(uid) {
                var item = uid,
                    dataSource = homeViewModel.get('dataSource'),
                    itemModel = dataSource.getByUid(item);
                itemModel.DescriptionUrl = processImage(itemModel.Description);

                if (!itemModel.Headline) {
                    itemModel.Headline = String.fromCharCode(160);
                }

                /// start detail form initialization
                /// end detail form initialization

                homeViewModel.set('originalItem', itemModel);
                homeViewModel.set('currentItem',
                    homeViewModel.fixHierarchicalData(itemModel));

                return itemModel;
            },
            linkBind: function(linkString) {
                var linkChunks = linkString.split('|');
                if (linkChunks[0].length === 0) {
                    return this.get('currentItem.' + linkChunks[1]);
                }
                return linkChunks[0] + this.get('currentItem.' + linkChunks[1]);
            },
            /// start masterDetails view model functions
            /// end masterDetails view model functions
            currentItem: {}
        });

    parent.set('addItemViewModel', kendo.observable({
        /// start add model properties
        /// end add model properties
        /// start add model functions

        editLocation: function(field) {
            field = field.target.id.split('-')[0];
            $("#locationEditor").show();
            setupMap('locationEditMap', null, field);
        },
        useCurrentLocation: function(field) {

            field = field.target.id.split('-')[0];
            var addFormData = this.get('addFormData');
            getLocation()
                .then(function(userPosition) {
                    addFormData[field].set('latitude', userPosition.coords.latitude);
                    addFormData[field].set('longitude', userPosition.coords.longitude);
                    setupMap(field, userPosition.coords);
                });

        },
        /// end add model functions

        onShow: function(e) {
            this.set('addFormData', {
                timeFixedStop: '',
                timeFixedStart: '',
                locationOnline: '',
                description: '',
                headline: '',
                /// start add form data init

                fileUpload: '',

                locationTest: {
                    longitude: '',
                    latitude: ''
                },
                /// end add form data init

            });
            /// start add form show

            app.showFileUploadName('add-item-view');

            setupMap('locationTest');
            /// end add form show

        },
        onCancel: function() {
            /// start add model cancel

            app.clearFormDomData('add-item-view');
            /// end add model cancel

        },
        onSaveClick: function(e) {
            var addFormData = this.get('addFormData'),
                filter = homeViewModel && homeViewModel.get('paramFilter'),
                dataSource = homeViewModel.get('dataSource'),
                addModel = {};

            if (filter && filter.value && filter.field) {
                addModel[filter.field] = filter.value;
            }

            function saveModel(data) {
                /// start add form data save
                addModel.TimeFixedStop = addFormData.timeFixedStop;
                addModel.TimeFixedStart = addFormData.timeFixedStart;
                if (e.sender.element.closest('.km-view').find('input[type=radio][name=group1]:checked')) {
                    addModel.Online = addFormData[e.sender.element.closest('.km-view').find('input[type=radio][name=group1]:checked').attr('id')];
                }
                addModel.Description = addFormData.description;
                addModel.Headline = addFormData.headline;

                if (data.fileUploadIndex) {
                    addModel.Image1 = data.fileUploadIndex.Id;
                }

                addModel.LocationStart = {
                        latitude: homeViewModel['locationTestmarkersLayerMarker'][0],
                        longitude: homeViewModel['locationTestmarkersLayerMarker'][1]
                    }
                    /// end add form data save

                dataSource.add(addModel);
                dataSource.one('change', function(e) {
                    app.mobileApp.navigate('#:back');
                });

                dataSource.sync();
                app.clearFormDomData('add-item-view');
            };

            /// start add form save

            var uploaded = [],
                totalUploadFields = 0;

            var fileUploadReader = new FileReader(),
                fileUploadField = $("#fileUpload")[0].files[0];

            fileUploadReader.onload = function() {
                var file = {
                    "Filename": fileUploadField.name,
                    "ContentType": fileUploadField.type,
                    "base64": fileUploadReader.result.split(',')[1]
                };

                dataProvider.files.create(file,
                    success.bind(this, "fileUploadIndex"),
                    function(error) {
                        alert(JSON.stringify(error));
                    });
            };

            if (!fileUploadField) {
                success("fileUpload", {});
            } else {
                fileUploadReader.readAsDataURL(fileUploadField);
                totalUploadFields++;
            }
            /// end add form save

            /// start add form save handler
            function success(fileName, data) {
                /// start upload fields
                /// end upload fields

                uploaded[fileName] = data.result;
                if (data.result) {
                    uploaded.length++;
                } else {
                    alert("Error, when uploading!");
                }

                if (uploaded.length == totalUploadFields) {
                    saveModel(uploaded);
                }
            }
            /// end add form save handler
        }
    }));

    if (typeof dataProvider.sbProviderReady === 'function') {
        dataProvider.sbProviderReady(function dl_sbProviderReady() {
            parent.set('homeViewModel', homeViewModel);
            var param = parent.get('homeViewModel_delayedFetch');
            if (typeof param !== 'undefined') {
                parent.set('homeViewModel_delayedFetch', undefined);
                fetchFilteredData(param);
            }
        });
    } else {
        parent.set('homeViewModel', homeViewModel);
    }

    parent.set('onShow', function(e) {
        var param = e.view.params.filter ? JSON.parse(e.view.params.filter) : null,
            isListmenu = false,
            backbutton = e.view.element && e.view.element.find('header [data-role="navbar"] .backButtonWrapper'),
            dataSourceOptions = homeViewModel.get('_dataSourceOptions'),
            dataSource;

        if (param || isListmenu) {
            backbutton.show();
            backbutton.css('visibility', 'visible');
        } else {
            if (e.view.element.find('header [data-role="navbar"] [data-role="button"]').length) {
                backbutton.hide();
            } else {
                backbutton.css('visibility', 'hidden');
            }
        }

        app.mobileApp.pane.loader.show();
        homeViewModel.set('mapVisble', false);
        homeViewModel.set('itemDetailsVisible', false);

        if (!homeViewModel.get('dataSource')) {
            dataSource = new kendo.data.DataSource(dataSourceOptions);
            homeViewModel.set('dataSource', dataSource);
            dataSource.one('change', setupMapView);
        }

        fetchFilteredData(param);
    });

    parent.set('onHide', function() {
        var dataSource = homeViewModel.get('dataSource');
        dataSource.unbind('change', setupMapView);
    });

})(app.homeView);

// START_CUSTOM_CODE_homeViewModel
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_homeViewModel