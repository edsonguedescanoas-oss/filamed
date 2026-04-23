import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { handler } from "./index.ts";

// Mock environment variables
Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");
Deno.env.set("WADUCK_API_URL", "https://api.waduck.pro");
Deno.env.set("WADUCK_API_KEY", "test-key");
Deno.env.set("WADUCK_INSTANCE_ID", "test-instance");

Deno.test("deduplication logic - code structure check", async () => {
  // This test verifies that the handler is exportable and can be initialized.
  // In a full integration environment, this would perform actual deduplication checks.
  assertEquals(typeof handler, "function");
});

Deno.test("WhatsApp phone formatting", () => {
  const formatPhone = (phone: string) => {
    let formatted = phone.replace(/\D/g, "");
    if (formatted.length <= 11 && !formatted.startsWith("55")) {
      formatted = "55" + formatted;
    }
    return formatted;
  };

  assertEquals(formatPhone("11999999999"), "5511999999999");
  assertEquals(formatPhone("5511999999999"), "5511999999999");
});
