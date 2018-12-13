var express = require('express');
var router = express.Router();
var mongojs = require('mongojs');
var db = mongojs('mongodb://teste:teste123@ds143593.mlab.com:43593/teste');
const http = require('http');

// Get All Orders
router.get('/orders', function (req, res, next) {
    db.orders.find(function (err, orders) {
        if (err) {
            res.send(err);
        }
        res.json(orders);
    })
});

// Get Itens From Order
router.get('/order/:id/itens', function (req, res, next) {
    db.orders.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, order) {
        if (err) {
            res.send(err);
        }
        res.json(order.itens);
    })
});

// Get Item From Order
router.get('/order/:id/itens/:idp', function (req, res, next) {
    var done = false;
    var found = false;
    db.orders.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, order) {
        if (err) {
            res.send(err);
        }
        for (index = 0; index < order.itens.length; ++index) {
            if (order.itens[index].id == req.params.idp) {
                res.json(order.itens[index]);
                found = true;
            }
            if (index == order.itens.length - 1) done = true;
        }
        while (!done);
        if (!found) res.json("Not Found");
    })
});


// Get Single Order
router.get('/order/:id', function (req, res, next) {
    db.orders.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, order) {
        if (err) {
            res.send(err);
        }
        res.json(order);
    })
});


// Save Order
router.post('/order', function (req, res, next) {
    var done = false;
    var ret = validateOrder(req.body);
    done = true;
    while (!done);
    if (ret == "OK") {
        var order = req.body;
        db.orders.save(order, function (err, order) {
            if (err) {
                res.send(err);
            }
            res.json(order);
        });
    } else {
        res.json(ret);
    }
});

// Delete order
router.delete('/order/:id', function (req, res, next) {
    db.orders.remove({ _id: mongojs.ObjectId(req.params.id) }, function (err, order) {
        if (err) {
            res.send(err);
        }
        res.json(order);
    })
});

// Update order
router.put('/order/:id', function (req, res, next) {
    var ret = validateOrder(req.params);
    if (ret == "OK") {
        var order = req.params;
        var updOrder = {};
        /*if (order.name) {
            updOrder.name = order.name;
        }*/
        if (!updOrder) {
            res.status(400);
            res.json({
                "error": "Bad Data"
            });
        } else {
            db.orders.update({ _id: mongojs.ObjectId(req.params.id) }, updOrder, {}, function (err, order) {
                if (err) {
                    res.send(err);
                }
                res.json(order);
            });
        }
    } else {
        res.json(ret);
    }
});

function validateOrder(order) {
    var done = false;
    var host = 'http://localhost:5000';
    if (typeof order.name == 'undefined') return "Invalid Order! Name missing";
    if (typeof order.item.id == 'undefined') return "Invalid Order! Item id missing";
    if (typeof order.item.name == 'undefined') return "Invalid Order! Item name missing";
    /*for (var ele in order.itemProduct) {
        if (typeof ele.id == 'undefined') return "Invalid Order! Item Product id missing";
        if (typeof ele.name == 'undefined') return "Invalid Order! Item Product name missing";
    }*/

    // vai buscar informacao do Pai
    var productPai;
    const request = require('request');
    request({
        method: "GET",
        rejectUnauthorized: false,
        url: 'http://localhost:5000/api/product/' + order.item.id
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            productPai = body;
        } else {
            return "Ocorreu um erro! " + error;
        }
        // para cada itemProduto
        var i;
        var done = true;
        for (i = 0; i < order.itemProduct.length; i++) {
            while(!done);
            done =false;
            console.log('XUXA CRL');
            if (typeof order.itemProduct[i].id == 'undefined') return "Invalid Order! Item Product id missing";
            if (typeof order.itemProduct[i].name == 'undefined') return "Invalid Order! Item Product name missing";
            // vai buscar aggregacao
            //const request = require('request');
            request({
                method: "GET",
                rejectUnauthorized: false,
                url: host + '/api/aggregation/' + order.item.id + '/' + order.itemProduct[i].id
            }, function (error, response, body) {
                console.log('xuxinha');
                console.log(i);
                console.log(host + '/api/aggregation/' + order.item.id + '/' + order.itemProduct[i].id);
                if (!error && response.statusCode == 200) {
                    console.log('XUXA CRL FODASSE');
                    var aggregation = body;
                    // vai buscar informacao do filho
                    var productFilho;
                    //const request = require('request');
                    /*request({
                        method: "GET",
                        "rejectUnauthorized": false,
                        "url": host + '/api/product/' + order.item.id
                    }, function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            productFilho = body;
                        } else {
                            return "Ocorreu um erro! " + error;
                        }
                        // valida same material
                        if (aggregation.sameMaterialRequired == 'True') {
                            if (productPai.materials !== productFilho.materials) {
                                return "Erro. Materiais diferentes";
                            }
                        }
                        // valida percentage min max
                        if ((productFilho.length * productFilho.height * productFilho.depth) / (productPai.length * productPai.height * productPai.depth) * 100 < aggregation.minPercentage) {
                            return "Erro. Produto Filho nao preenche ocupação mínima.";
                        }
                        if ((productFilho.length * productFilho.height * productFilho.depth) / (productPai.length * productPai.height * productPai.depth) * 100 > aggregation.maxPercentage) {
                            return "Erro. Produto Filho excede ocupação máxima.";
                        }
                        // valida de item pai é mesmo pai e tem filhos e tambem que tem todas as agregacoes obrigatorias
                        //const request = require('request');
                        request({
                            method: "GET",
                            "rejectUnauthorized": false,
                            "url": host + '/api/product/' + order.item.id + '/Partes'
                        }, function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                                var aggregations = body;
                                var i;
                                for (i = 0; i < aggregations.length; i++) {
                                    if (aggregations[i].type == 'true') {
                                        var j;
                                        var found = false;
                                        for (j = 0; j < order.itemProduct.length; j++) {
                                            if (aggregations[i].productChild == order.itemProduct[j].id) {
                                                found = true;
                                            }
                                        }
                                    }
                                    if (!found) {
                                        return "Agregações obrigatórias em falta";
                                    }
                                }
                            } else {
                                return "Ocorreu um erro! " + error;
                            }
                            done = true;
                        });
                    });*/
                    console.log(body);
                } else {
                    return "Ocorreu um erro! " + error;
                }
                done = true;
            });
            //console.log(order.itemProduct[i].id);
            //console.log(order.itemProduct[i].name);
        }
    });
    //while(!done);
    return "OK";
    /*request({
        method: "GET",
        "rejectUnauthorized": false,
        "url": 'http://localhost:5000/api/product/1' }
    , function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body); // Show the HTML for the Google homepage. 
        }

    });*/
}

module.exports = router;