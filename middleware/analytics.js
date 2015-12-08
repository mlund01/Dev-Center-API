var Keen = require('keen-js');

analytics = {};

keen = new Keen({
        projectId: '561c1f5946f9a76e5db2583c',
        masterKey: '9E3B52958B91529377184EF2CE56E2B2',
        writeKey: '8fa38f0e5ff7444be52eb0fa8cee4fd5291753cce940c5895179bcf9c75cbeb9b9416383bf7b060f5b8f20521cb2c4933a88fd6065a89a2e27e4dbda7196e4ff835c3bceb064667810b57e32d33198345b6dff5c83f8ab9c386ce55b4afb3305a4aa94b3b81a1ff1e5ec1a74fc905577',
        readKey: '348def2aa2aaef3fe5f20b42fdc408ad60fec8814ac60b9fc2ae70af784a030d09053b35fe6cd7498955298d24dc3345d23785ee9dc0a99417f687c09ef117714d8d6be255670443aa6ef17859780a7019dd4d90ee20df2358c797edcc21bafa5884a7b951365a4545db7ac151d664c2'
}
);

analytics.registrationEvent = function(data) {
    var eventObj = {
        Username: data.Username,
        Email: data.Email,
        FirstName: data.FirstName,
        LastName: data.LastName
    };

    keen.addEvent("registration", eventObj)
};

analytics.classEntryEvent = function(courseid, classid, Email, FirstName, LastName) {
    var eventObj = {
        classID: classid,
        courseID: courseid,
        Email: Email,
        FirstName: FirstName,
        LastName: LastName
    };
    keen.addEvent("classEntered", eventObj)
};

analytics.consoleEvent = function(data, user) {
    var eventObj = {
        Service: data.Service || null,
        Method: data.Method || null,
        CompanyName: data.CompanyName || null,
        Description: data.Description || null,
        Success: data.Success || null,
        Email: user.Email || null,
        FirstName: user.FirstName || null,
        LastName: user.LastName || null
    };
    keen.addEvent("consoleEvent", eventObj);
};

analytics.createOrgEvent = function(data, user) {
    var eventObj = {
        CompanyName: data.CompanyName,
        AdminEmail: data.AdminEmail,
        Email: user.Email,
        FirstName: user.FirstName,
        LastName: user.LastName
    };
    keen.addEvent("createOrgEvent", eventObj);
};

module.exports = analytics;


