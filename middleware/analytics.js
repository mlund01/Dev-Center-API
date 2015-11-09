var Keen = require('keen-js');

analytics = {};

keen = new Keen({
        projectId: '561c1f5946f9a76e5db2583c',
        writeKey: '8fa38f0e5ff7444be52eb0fa8cee4fd5291753cce940c5895179bcf9c75cbeb9b9416383bf7b060f5b8f20521cb2c4933a88fd6065a89a2e27e4dbda7196e4ff835c3bceb064667810b57e32d33198345b6dff5c83f8ab9c386ce55b4afb3305a4aa94b3b81a1ff1e5ec1a74fc905577'
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

analytics.classEntryEvent = function(courseid, classid, Email) {
    var eventObj = {
        classID: classid,
        courseID: courseid,
        UserEmail: Email
    };
    keen.addEvent("classEntered", eventObj)
};

module.exports = analytics;

