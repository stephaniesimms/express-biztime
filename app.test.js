process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("./app");
const db = require("./db");

let company;

beforeEach(async function() {
    let result = await db.query(`
      INSERT INTO
        companies (code, name, description) VALUES ('zoom', 'Zoom', 'BAD BAD SECURITY')
        RETURNING code, name, description`);
    company = result.rows[0];
  });

afterEach(async function() {
    // delete any data created by test
    await db.query("DELETE FROM companies");
});

afterAll(async function() {
    // close db connection
    await db.end();
});

/** GET /companies - returns list of companies, like {companies: [{code, name}, ...]} */
describe("GET /companies", function() {
    test("Gets a list of all companies", async function() {
      const response = await request(app).get("/companies");
      expect(response.statusCode).toEqual(200);
      expect(response.body).toEqual([{
            code: "zoom",
            name: "Zoom"
        }]);
    });
});

/** GET /companies/:code - returns JSON with company info {companies: [{code, name}, ...]} */
describe("GET /companies/:code", function() {
    test("Gets company info", async function() {
      const response = await request(app).get("/companies/zoom");
      expect(response.statusCode).toEqual(200);
      expect(response.body).toEqual({
          company: {
              code: "zoom", 
              name: "Zoom",
              description: "BAD BAD SECURITY"
            }
        });
    });

    test("Returns error if company is not found", async function() {
        const response = await request(app).get("/companies/wrong");
        expect(response.statusCode).toEqual(404);
        expect(response.body.error).toEqual({"message": "Company cannot be found", "status": 404});
      });
});

/** POST /companies - Adds a company.
Needs to be given JSON like: {code, name, description}
Returns JSON of new company: {company: {code, name, description}} */
describe("POST /companies", function() {
    test("Succesfully adds a company", async function() {
        const resp = await request(app)
            .post("/companies")
            .send({
                "code": "mongodb",
                "name": "MongoDB", 
                "description": "MONGOOOOOODB"
            });

        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({"company":{"code":"mongodb", "name":"MongoDB", "description":"MONGOOOOOODB"}});
    });

    test("Returns error if user is trying to add a duplicate item", async function() {
        const resp = await request(app)
            .post("/companies")
            .send({
                "code": "zoom",
                "name": "Zoom", 
                "description": "BAD BAD SECURITY"
            });

        expect(resp.statusCode).toBe(500);
        expect(resp.body.message).toEqual("duplicate key value violates unique constraint \"companies_pkey\"");
    });

    test("Returns error if information is improperly formatted", async function() { 
        const resp = await request(app)
        .post("/companies")
        .send({
            "code": "apple"
        });

        expect(resp.statusCode).toBe(404);
        expect(resp.body.error).toEqual({"message": "Please provide all inputs", "status": 404});
    });
});


/* PUT /companies/[code] edits existing company
- Returns JSON with updated company object: {company: {code, name, description}} 
- Or returns error if user is trying to update a company that is not in database
*/
describe("PUT /companies", function() {
    test("Succesfully updates a company", async function() {
        const resp = await request(app)
            .put(`/companies/${company.code}`)
            .send({
                "name":"Zoom", 
                "description": "Zo0o0o0om"
            });

        expect(resp.statusCode).toEqual(200);
        expect(resp.body).toEqual({
            "company":{
                "code": "zoom", 
                "name": "Zoom", 
                "description": "Zo0o0o0om"
            }
        });
    });

    test("Returns error if user is trying to update a company that is not in database", async function() {
        const resp = await request(app)
        .patch("/companies/wrong")
        .send({
            "name":"Zoom", 
            "description": "Zo0o0o0om"
        });

        expect(resp.statusCode).toBe(404);
        expect(resp.body.error).toEqual({"message": "Not Found", "status": 404});
    });
});

/* DELETE /companies/[code] - Deletes company.
- Returns {status: "deleted"}
- Or returns 404 if company cannot be found.
*/
describe("DELETE /companies", function() {
    test("Succesfully updates a company", async function() {
        const resp = await request(app)
            .delete(`/companies/${company.code}`);

        expect(resp.statusCode).toEqual(200);
        expect(resp.body).toEqual({status: "deleted"});
    });

    test("Returns error if user is trying to delete a company that is not in database", async function() {
        const resp = await request(app)
            .delete(`/companies/wrong`);

        expect(resp.statusCode).toBe(404);
        expect(resp.body.error).toEqual({"message": "Company cannot be found", "status": 404});
    });
});


// Testing Deleting
// - Success: {status: "deleted"}
// - Fail: "Company cannot be found", 404

// ----------

// Testing Reading
// ALL
// - Success: {companies: [{code, name}, ...]
// ONE COMPANY
// - Success: {company: {code, name, description}
// - Fail: "Company cannot be found", 404

// Testing Creating
// - Success: {company: {code, name, description}} 
// - Fail: "Please provide all inputs", 404

// Testing Updating
// - Success: {company: {code, name, description}} 
// - Fail: "Company cannot be found", 404

