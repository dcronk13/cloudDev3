const express = require('express');
const app = express();
const json2html = require('json-to-html');

const { Datastore } = require('@google-cloud/datastore');

const datastore2 = new Datastore();

const BOAT = "Boat";


const router = express.Router();
const url = "https://hw5-cronkd.wl.r.appspot.com";

app.use(express.json());

function fromDatastore(item) {
    item.id = item[Datastore.KEY].id;
    return item;
}

function contains(data, key, val) {
    for (var i = 0; i < data.length; i++) {
      if (data[i][key] === val) return true;
    }
    return false;
  }

function post_boat(name, type, length) {
    var key = datastore2.key(BOAT);
    const new_boat = { "name": name, "type": type, "length": length };
    return datastore2.save({ "key": key, "data": new_boat }).then(() => { return key });
}

function get_boats() {
    const q = datastore2.createQuery(BOAT);
    return datastore2.runQuery(q).then((entities) => {
        return entities[0].map(fromDatastore);
    });
}

function get_boat(id) {
    const key = datastore2.key([BOAT, parseInt(id, 10)]);
    return datastore2.get(key).then((entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            // No entity found. Don't try to add the id attribute
            return entity;
        } else {
            // Use Array.map to call the function fromDatastore. This function
            // adds id attribute to every element in the array entity
            return entity.map(fromDatastore);
        }
    });
}

function put_boat(id, name, type, length) {
    const key = datastore2.key([BOAT, parseInt(id, 10)]);
    const boat = { "name": name, "type": type, "length": length };
    return datastore2.save({ "key": key, "data": boat }).then(() => { return key });
}

function delete_boat(id) {
    const key = datastore2.key([BOAT, parseInt(id, 10)]);
    return datastore2.delete(key);
}

router.get('/', function (req, res) {
    const boats = get_boats()
    .then((boats) => {
        res.status(200).send(boats);
    });
});

router.post('/', function (req, res) {
    const accepts = req.accepts(['application/json']);
    if (req.get('content-type') !== 'application/json') {
        res.status(415).send({ Error: "Request was sent with unsupported MIME type" });
    }
    else if (!accepts) {
        res.status(406).send({ Error: "Request set accept to unsupported MIME type" });
    }
    else if (JSON.stringify(req.body).includes("name") && JSON.stringify(req.body).includes("type") && JSON.stringify(req.body).includes("length")) {
        const boats = get_boats()
        .then((boats) => {
            if (contains(boats, "name", req.body.name)) {
                res.status(403).send({ Error: "Name of boat already exists" });
            }
            else if (/^.*[^A-Za-z0-9\.\s\'\"]+.*$/.test(req.body.name) || /^.*[^A-Za-z0-9\.\s\'\"]+.*$/.test(req.body.type) || /^\d*[^0-9]+\d*$/.test(req.body.length)){
                res.status(400).send({ Error: "At least one of the required attributes is invalid" });
            }
            else {
                post_boat(req.body.name, req.body.type, req.body.length).then(key => { res.status(201).send({ id: key.id, name: req.body.name, type: req.body.type, length: req.body.length, self: url + "/boats/"+ key.id })});
            }  
        });       
    }
    else {
        res.status(400).send({ Error: "The request object is missing at least one of the required attributes" });
    }
});    

router.delete('/', function (req, res){
    res.set('Accept', 'GET, POST');
    res.status(405).end();
});

router.delete('/:id', function (req, res) {
    get_boat(req.params.id)
        .then(boat => {
            if (boat[0] === undefined || boat[0] === null) {
                // The 0th element is undefined. This means there is no lodging with this id
                res.status(404).send({ Error: "No boat with this boat_id exists" });
            } else {
                delete_boat(req.params.id).then(res.status(204).end());
            }
        });
});

router.get('/:id', function (req, res) {
    const accepts = req.accepts(['application/json', 'text/html', '*/*']);
    get_boat(req.params.id)
    .then(boat => {
        if (boat[0] === undefined || boat[0] === null) {
            res.status(404).send({ Error: "No boat with this boat_id exists" });
        } 
        else if (!accepts) {
            res.status(406).send({ Error: "Request set accept to unsupported MIME type" });
        }
        else if (accepts === 'application/json' || accepts === '*/*') {
            res.status(200).send({ id: boat[0].id, name: boat[0].name, type: boat[0].type, length: boat[0].length, self: url + "/boats/"+boat[0].id });
        }
        else if (accepts === 'text/html') {
            res.status(200).send(json2html({ id: boat[0].id, name: boat[0].name, type: boat[0].type, length: boat[0].length, self: url + "/boats/"+boat[0].id }));
        }
    });
});

router.put('/', function (req, res){
    res.set('Accept', 'GET, POST');
    res.status(405).end();
});

router.put('/:id', function (req, res) {
    const accepts = req.accepts(['application/json']);
    if (req.get('content-type') !== 'application/json') {
        res.status(415).send({ Error: "Request was sent with unsupported MIME type" });
    }
    else if (!accepts) {
        res.status(406).send({ Error: "Request set accept to unsupported MIME type" });
    }
    else if (JSON.stringify(req.body).includes("name") && JSON.stringify(req.body).includes("type") && JSON.stringify(req.body).includes("length")) {
        const boats = get_boats()
        .then((boats) => {
            if (contains(boats, "name", req.body.name)) {
                res.status(403).send({ Error: "Name of boat already exists" });
            }
            else if (/^.*[^A-Za-z0-9\.\s\'\"]+.*$/.test(req.body.name) || /^.*[^A-Za-z0-9\.\s\'\"]+.*$/.test(req.body.type) || /^\d*[^0-9]+\d*$/.test(req.body.length)){
                res.status(400).send({ Error: "At least one of the required attributes is invalid" });
            }
            else {
                get_boat(req.params.id)
                .then(boat => {
                    if (boat[0] === undefined || boat[0] === null) {
                        res.status(404).send({ Error: "No boat with this boat_id exists" });
                    } 
                    else {
                        
                        put_boat(boat[0].id, req.body.name, req.body.type, req.body.length).then(key => { 
                            res.location(req.protocol + "://" + req.get('host') + req.baseUrl + '/' + key.id);
                            res.status(303).send({ id: key.id, name: req.body.name, type: req.body.type, length: req.body.length, self: url + "/boats/"+ key.id })});
                    }
                });
            }  
        });       
    }
    else {
        res.status(400).send({ Error: "The request object is missing at least one of the required attributes" });
    }
}); 

router.patch('/:id', function (req, res) {
    const accepts = req.accepts(['application/json']);
    if (req.get('content-type') !== 'application/json') {
        res.status(415).send({ Error: "Request was sent with unsupported MIME type" });
    }
    else if (!accepts) {
        res.status(406).send({ Error: "Request set accept to unsupported MIME type" });
    }
    else if (JSON.stringify(req.body).includes("name") || JSON.stringify(req.body).includes("type") || JSON.stringify(req.body).includes("length")) {
        get_boat(req.params.id)
        .then(boat => {
            if (boat[0] === undefined || boat[0] === null) {
                res.status(404).send({ Error: "No boat with this boat_id exists" });
            }
            else {
                get_boats()
                .then((boats) => { 
                    var checkName = boat[0].name;
                    var checkType = boat[0].type;
                    var checkLength = boat[0].length;
                    var sameName = false;
                    if (JSON.stringify(req.body).includes("name") && /^.*[^A-Za-z0-9\.\s\'\"]+.*$/.test(req.body.name) == false && contains(boats, "name", req.body.name) == false) {
                        var checkName = req.body.name;
                    }
                    else if (contains(boats, "name", req.body.name)) {
                        var sameName = true;
                    }
                    if (JSON.stringify(req.body).includes("type") && /^.*[^A-Za-z0-9\.\s\'\"]+.*$/.test(req.body.type) == false) {
                        var checkType = req.body.type;
                    }
                    if (JSON.stringify(req.body).includes("length") && /^\d*[^0-9]+\d*$/.test(req.body.length) == false) {
                        var checkLength = req.body.length;
                    }
                    if (checkName == boat[0].name && checkType == boat[0].type && checkLength == boat[0].length) {
                        if (sameName) {
                            res.status(403).send({ Error: "Name of boat already exists" });
                        }
                        else {
                            res.status(400).send({ Error: "At least one of the required attributes is invalid" });
                        }
                    }
                    else {
                        put_boat(boat[0].id, checkName, checkType, checkLength).then(key => { res.status(200).send({ id: key.id, name: checkName, type: checkType, length: checkLength, self: url + "/boats/"+ key.id })});
                    }
                });
            }
        });             
    }      
    else {
        res.status(400).send({ Error: "The request object is missing at least one of the required attributes" });
    }
});

app.use('/boats', router);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});
