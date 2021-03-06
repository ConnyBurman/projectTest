'use strict';

app.settingsView = kendo.observable({
    onShow: function() {},
    afterShow: function() {}
});
app.localization.registerView('settingsView');

// START_CUSTOM_CODE_settingsView
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes
(function() {
    app.settingsView.set('title', 'Settings');
})();
// END_CUSTOM_CODE_settingsView
(function(parent) {
    var
    /// start global model properties
    /// end global model properties
        dataProvider = app.data.backendServices,
        dataSourceOptions = {
            type: 'everlive',
            transport: {
                typeName: 'Settings',
                dataProvider: dataProvider
            },
            error: function(e) {
                if (e.xhr) {
                    alert(JSON.stringify(e.xhr));
                }
            }
        },
        settingsViewModel = kendo.observable({
            submit: function() {
                var addFormData = parent.get('addFormData'),
                    addModel = {};

                app.mobileApp.showLoading();

                function saveModel(data) {
                    /// start add form data save
                    addModel.AllowSnapserviceEmail = addFormData.allowSnapserviceEmail;
                    addModel.AllowShowLatestActivity = addFormData.allowShowLatestActivity;
                    addModel.AllowPush = addFormData.allowPush;
                    addModel.AllowShowCurrentLocation = addFormData.allowShowCurrentLocation;
                    addModel.AllowShowPhone = addFormData.allowShowPhone;
                    addModel.AllowShowEmail = addFormData.allowShowEmail;
                    addModel.TagThree = addFormData.tagThree;
                    addModel.TagTwo = addFormData.tagTwo;
                    addModel.TagOne = addFormData.tagOne;
                    /// end add form data save
                    var dataSource = new kendo.data.DataSource(dataSourceOptions);
                    dataSource.add(addModel);
                    dataSource.one('change', function(e) {
                        // datasource operation finished
                        app.mobileApp.hideLoading();
                        app.showNotification('Saved');
                    });

                    dataSource.one('error', function(error) {
                        showErrorMessage(error.xhr || error);
                    });

                    dataSource.sync();
                };

                function showErrorMessage(error) {
                    alert('code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
                    app.mobileApp.hideLoading();
                }

                /// start add form save
                /// end add form save
                /// start add form save handler
                saveModel();
                /// end add form save handler
            },
            /// start add model functions
            /// end add model functions

            /// start add model properties
            /// end add model properties

        });

    /// start form functions
    /// end form functions

    parent.set('onShow', function _onShow() {
        var that = parent;
        that.set('addFormData', {
            allowSnapserviceEmail: '',
            allowShowLatestActivity: '',
            allowPush: '',
            allowShowCurrentLocation: '',
            allowShowPhone: '',
            allowShowEmail: '',
            tagThree: '',
            tagTwo: '',
            tagOne: '',
            heading: 'Ange sökord',
            /// start add form data init
            /// end add form data init
        });
        /// start add form show
        /// end add form show
    });
    parent.set('settingsViewModel', settingsViewModel);
})(app.settingsView);

// START_CUSTOM_CODE_settingsViewModel
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_settingsViewModel