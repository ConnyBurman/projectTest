'use strict';

app.myAccountView = kendo.observable({
    onShow: function() {},
    afterShow: function() {}
});
app.localization.registerView('myAccountView');

// START_CUSTOM_CODE_myAccountView
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_myAccountView
(function(parent) {
    var
    /// start global model properties
    /// end global model properties
        dataProvider = app.data.backendServices,
        dataSourceOptions = {
            type: 'everlive',
            transport: {
                typeName: 'Users',
                dataProvider: dataProvider
            },
            error: function(e) {
                if (e.xhr) {
                    alert(JSON.stringify(e.xhr));
                }
            }
        },
        myAccountViewModel = kendo.observable({
            submit: function() {
                var addFormData = parent.get('addFormData'),
                    addModel = {};

                app.mobileApp.showLoading();

                function saveModel(data) {
                    /// start add form data save
                    addModel.PasswordSalt = addFormData.password;
                    addModel.Email = addFormData.email;
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

            cancel: function() {
                    /// start add model cancel
                    /// end add model cancel
                }
                /// start add model properties
                /// end add model properties

        });

    /// start form functions
    /// end form functions

    parent.set('onShow', function _onShow() {
        var that = parent;
        that.set('addFormData', {
            password: '',
            email: '',
            /// start add form data init
            /// end add form data init
        });
        /// start add form show
        /// end add form show
    });
    parent.set('myAccountViewModel', myAccountViewModel);
})(app.myAccountView);

// START_CUSTOM_CODE_myAccountViewModel
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_myAccountViewModel