const express = require("express");
const router = new express.Router();
const ExpressError = require("../expressError") // error
const db = require("../db");

// GET /invoices - returns info on invoices: like {invoices: [{id, comp_code}, ...]}
router.get("/", async function(req, res, next) {
    try {
        const results = await db.query(
            `SELECT id, comp_code FROM invoices`);
        return res.json({invoices: [results.rows]});

    } catch(err) {
        return next(err);
    }
});

/* GET /invoices/[id] - Returns JSON on given invoice.
If invoice cannot be found, returns 404.
Returns {invoice: {id, amt, paid, add_date, paid_date, company: {code, name, description}} */
router.get("/:id", async function(req, res, next) {
    try {

        const invoiceResult = await db.query(
            `SELECT id, amt, paid, add_date, paid_date 
                FROM invoices 
                WHERE id=$1`, [req.params.id]);

        if (invoiceResult.rows.length === 0){
            throw new ExpressError("Invoice cannot be found", 404);
        }

        const companyResult = await db.query(
            `SELECT c.code, c.name, c.description 
                FROM companies AS c
                JOIN invoices AS i 
                ON c.code = i.comp_code
                WHERE i.id=$1`, 
                [req.params.id]);
        
        const invoiceInfo = invoiceResult.rows[0];
        invoiceInfo.company = companyResult.rows[0];

        return res.json({invoice: invoiceInfo});

    } catch(err){
        return next(err);
    }
});


/* POST /invoices - adds an invoice.
- Needs to be passed in JSON body of: {comp_code, amt}
- Returns: {invoice: {id, comp_code, amt, paid, add_date, paid_date}} */
router.post("/", async function(req, res, next) {
    try {
        const { comp_code, amt } = req.body;

        // checks for comp_code and amt keys 
        if (comp_code === undefined || amt === undefined ){
            throw new ExpressError("Please provide all inputs", 404);
        }

        const results = await db.query(
            `INSERT INTO invoices (comp_code, amt)
                VALUES ($1, $2)
                RETURNING id, comp_code, amt, paid, add_date, paid_date`,
                [comp_code, amt]
        );

        return res.json({invoice: results.rows[0]});

    } catch(err){
        return next(err);
    }
});

/* PUT /invoices/[id]- Updates an invoice.
- If invoice cannot be found, returns a 404.
- Needs to be passed in a JSON body of {amt}
- Returns: {invoice: {id, comp_code, amt, paid, add_date, paid_date}}
*/
router.put("/:id", async function(req, res, next) {
    try {
        const { amt } = req.body;

        const results = await db.query(
            `UPDATE invoices
                SET amt = $1
                WHERE id = $2
                RETURNING id, comp_code, amt, paid, add_date, paid_date`,
                [amt, req.params.id]
        );

        const invoice = results.rows[0];

        if (!invoice){
            throw new ExpressError("Invoice cannot be found", 404);
        }

        return res.json({invoice});


        // if (results.rows.length === 0){
        //     throw new ExpressError("Invoice cannot be found", 404);
        // }

        // return res.json({invoice: results.rows[0]});

    } catch(err){
        return next(err);
    }
});


/* DELETE /invoices/[id] - deletes an invoice.
- If invoice cannot be found, returns a 404.
- Returns: {status: "deleted"}
*/
router.delete("/:id", async function(req, res, next) {
    try {
        const result = await db.query(
            `DELETE FROM invoices WHERE id=$1
                RETURNING id, comp_code, amt`,
                [req.params.id]
        );

        if (result.rows.length === 0){
            throw new ExpressError("Invoice cannot be found", 404);
        }

        return res.json({status: "deleted"});

    } catch(err){
        return next(err);
    }
});

module.exports = router;