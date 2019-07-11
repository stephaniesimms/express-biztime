const express = require("express");
const router = new express.Router();
const ExpressError = require("../expressError") // error
const db = require("../db");
const slugify = require("slugify");

// GET /companies returns list of companies, like {companies: [{code, name}, ...]}
router.get("/", async function(req, res, next) {
    try {
        const results = await db.query(
            `SELECT code, name FROM companies`);
        return res.json(results.rows);

    } catch(err) {
        return next(err);
    }
});


/* GET /companies/[code] return obj of company: {company: {code, name, description, invoices: [id...]}} */
router.get("/:code", async function(req, res, next) {
    try {
        const results = await db.query(
            `SELECT c.code, c.name, c.description, i.id, industry.field 
                FROM companies AS c
                    LEFT JOIN invoices AS i
                    ON c.code = i.comp_code
                JOIN industries_companies AS ic
                    ON ic.company_code = c.code
                JOIN industries AS industry
                    ON industry.code = ic.industry_code
                WHERE c.code = $1`
                ,[req.params.code]);

        if (results.rows.length === 0){
            throw new ExpressError("Company cannot be found", 404);
        }

        let { code, name, description } = results.rows[0];
        let invoices = results.rows.map(entry => entry.id);
        let industries = results.rows.map(entry => entry.field);

        return res.json({company: { code, name, description, invoices, industries }});

    } catch(err){
        return next(err);
    }
});


/* POST /companies Adds a company.
Needs to be given JSON like: {code, name, description}
Returns JSON of new company: {company: {code, name, description}} */
router.post("/", async function(req, res, next) {
    try {
        const { code, name, description } = req.body;

        // COMMENTED OUT because it appears that db primary key uniqueness requirement catches this error for us
        // const existingCodesResults = await db.query(
        //     `SELECT code FROM companies`
        // );
        
        // if (existingCodesResults.rows.includes(code)) {
        //     throw new ExpressError("That company already exists", 404);
        // }

        // checks for code, name, and description keys 
        if (code === undefined || name === undefined || description === undefined){
            throw new ExpressError("Please provide all inputs", 404);
        }

        // checks that code, name, and description VALUES are not blank
        // if (!code || !name || !description) {
        //     throw new ExpressError("Please provide all inputs", 404);
        // }

        const results = await db.query(
            `INSERT INTO companies (code, name, description)
                VALUES ($1, $2, $3)
                RETURNING code, name, description`,
                [slugify(code), name, description]
        );

        return res.json({company: results.rows[0]});

    } catch(err){
        return next(err);
    }
});


/* PUT /companies/[code] Edits existing company
- Needs to be given JSON like: {name, description}
- Returns JSON with updated company object: {company: {code, name, description}} 
*/
router.put("/:code", async function(req, res, next) {
    try {
        const { name, description } = req.body;

        const results = await db.query(
            `UPDATE companies
                SET name = $1, description = $2
                WHERE code = $3
                RETURNING code, name, description`,
                [name, description, req.params.code]
        );

        if (results.rows.length === 0){
            throw new ExpressError("Company cannot be found", 404);
        }

        return res.json({company: results.rows[0]});

    } catch(err){
        return next(err);
    }
});


/* DELETE /companies/[code] - Deletes company.
- Should return 404 if company cannot be found.
- Returns {status: "deleted"}
*/
router.delete("/:code", async function(req, res, next) {
    try {

        const result = await db.query(
            `DELETE FROM companies WHERE code=$1
            RETURNING code, name, description`,
            [req.params.code]
        );

        if (result.rows.length === 0){
            throw new ExpressError("Company cannot be found", 404);
        }

        return res.json({status: "deleted"});

    } catch(err){
        return next(err);
    }
});


module.exports = router;