'use strict';

app.adsMapView = kendo.observable({
    onShow: function() {},
    afterShow: function() {}
});
app.localization.registerView('adsMapView');

// START_CUSTOM_CODE_adsMapView
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_adsMapView
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

        /// end global model properties
        fetchFilteredData = function(paramFilter, searchFilter) {
            var model = parent.get('adsMapViewModel'),
                dataSource;

            if (model) {
                dataSource = model.get('dataSource');
            } else {
                parent.set('adsMapViewModel_delayedFetch', paramFilter || null);
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
        defaultMapContainer = 'adsMapViewModelMap',
        setupMapView = function(container) {
            if (!adsMapViewModel.map) {
                if (typeof container !== 'string') {
                    container = defaultMapContainer;
                }
                adsMapViewModel.map = L.map(container);
                adsMapViewModel.markersLayer = new L.FeatureGroup();

                var tileLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                    attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                    id: 'mapbox.streets',
                    accessToken: 'pk.eyJ1IjoiMjAxNGlkMDAwMSIsImEiOiJjajM1ZjdrZmcwMDU4MzJzMjVwMWZmdGZ2In0.wQ32HhFCoCqbimWXU1x0wA'
                });

                adsMapViewModel.map.addLayer(tileLayer);

                adsMapViewModel.map.addLayer(adsMapViewModel.markersLayer);
                adsMapViewModel.map.on('click', function(e) {
                    adsMapViewModel.set('itemDetailsVisible', false);
                });

                adsMapViewModel.markersLayer.on('click', function(e) {
                    var marker, newItem;

                    marker = e.layer;
                    if (marker.options.icon.options.className.indexOf('current-marker') >= 0) {
                        return;
                    }

                    newItem = adsMapViewModel.setCurrentItemByUid(marker.options.uid);
                    adsMapViewModel.set('itemDetailsVisible', true);
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
                        data = adsMapViewModel.get('dataSource').data(),
                        userLatLang = L.latLng(userPosition.coords.latitude, userPosition.coords.longitude);

                    adsMapViewModel.map.setView(userLatLang, 15, {
                        animate: false
                    });
                    mapBounds = adsMapViewModel.map.getBounds();
                    adsMapViewModel.markersLayer.clearLayers();

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
                            adsMapViewModel.markersLayer.addLayer(marker);
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

                    adsMapViewModel.markersLayer.addLayer(currentMarker);

                    adsMapViewModel.set('mapVisble', true);
                    adsMapViewModel.map.invalidateSize({
                        reset: true
                    });
                    adsMapViewModel.map.fitBounds(mapBounds, {
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

                }

                if (adsMapViewModel.map) {
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
                        'LocationStart': {
                            field: 'LocationStart',
                            defaultValue: ''
                        },
                    },
                    icon: function() {
                        var i = 'globe';
                        return kendo.format('km-icon km-{0}', i);
                    }
                }
            },
            serverFiltering: true,

        },
        /// start data sources
        /// end data sources
        adsMapViewModel = kendo.observable({
            _dataSourceOptions: dataSourceOptions,
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
                var dataItem = e.dataItem || adsMapViewModel.originalItem;

                app.mobileApp.navigate('#components/adsMapView/details.html?uid=' + dataItem.uid);

            },
            detailsShow: function(e) {
                var uid = e.view.params.uid,
                    dataSource = adsMapViewModel.get('dataSource'),
                    itemModel = dataSource.getByUid(uid);

                adsMapViewModel.setCurrentItemByUid(uid);

                /// start detail form show
                /// end detail form show
            },
            setCurrentItemByUid: function(uid) {
                var item = uid,
                    dataSource = adsMapViewModel.get('dataSource'),
                    itemModel = dataSource.getByUid(item);
                itemModel.Image1Url = processImage(itemModel.Image1);

                if (!itemModel.LocationStart) {
                    itemModel.LocationStart = String.fromCharCode(160);
                }

                /// start detail form initialization
                /// end detail form initialization

                adsMapViewModel.set('originalItem', itemModel);
                adsMapViewModel.set('currentItem',
                    adsMapViewModel.fixHierarchicalData(itemModel));

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

    if (typeof dataProvider.sbProviderReady === 'function') {
        dataProvider.sbProviderReady(function dl_sbProviderReady() {
            parent.set('adsMapViewModel', adsMapViewModel);
            var param = parent.get('adsMapViewModel_delayedFetch');
            if (typeof param !== 'undefined') {
                parent.set('adsMapViewModel_delayedFetch', undefined);
                fetchFilteredData(param);
            }
        });
    } else {
        parent.set('adsMapViewModel', adsMapViewModel);
    }

    parent.set('onShow', function(e) {
        var param = e.view.params.filter ? JSON.parse(e.view.params.filter) : null,
            isListmenu = false,
            backbutton = e.view.element && e.view.element.find('header [data-role="navbar"] .backButtonWrapper'),
            dataSourceOptions = adsMapViewModel.get('_dataSourceOptions'),
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
        adsMapViewModel.set('mapVisble', false);
        adsMapViewModel.set('itemDetailsVisible', false);

        if (!adsMapViewModel.get('dataSource')) {
            dataSource = new kendo.data.DataSource(dataSourceOptions);
            adsMapViewModel.set('dataSource', dataSource);
            dataSource.one('change', setupMapView);
        }

        fetchFilteredData(param);
    });

    parent.set('onHide', function() {
        var dataSource = adsMapViewModel.get('dataSource');
        dataSource.unbind('change', setupMapView);
    });

})(app.adsMapView);

// START_CUSTOM_CODE_adsMapViewModel
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_adsMapViewModel