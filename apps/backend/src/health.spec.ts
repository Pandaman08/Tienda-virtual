import request from "supertest";
import { app } from "./app";

describe("health", () => {
  it("returns ok", async () => {
    const response = await request(app).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
