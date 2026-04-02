import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import fs from "fs";

/**
 * Scans a file for capabilities: endpoints, WASM exposures, bypass attempts, failure modes.
 */
export function detectCapabilities(filePath) {
  const code = fs.readFileSync(filePath, "utf-8");
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx", "decorators-legacy"],
  });

  const findings = {
    newEndpoints: [],
    wasmExposures: [],
    bypassAttempts: [],
    newFailureModes: [],
  };

  // Helper to get string value from AST node
  const getStringValue = (node) => {
    if (t.isStringLiteral(node)) return node.value;
    if (t.isTemplateLiteral(node) && node.quasis.length === 1) return node.quasis[0].value.raw;
    return null;
  };

  traverse.default(ast, {
    CallExpression(path) {
      const { callee } = path.node;

      // Express-style: app.get(), router.post(), app.use(...)
      if (t.isMemberExpression(callee) && 
          t.isIdentifier(callee.property) &&
          ["get", "post", "put", "delete", "patch", "use", "all"].includes(callee.property.name)) {
        
        const objName = t.isIdentifier(callee.object) ? callee.object.name : "";
        if (["app", "router", "expressRouter"].some(name => objName.includes(name) || name === "app")) {
          const route = getStringValue(path.node.arguments[0]) || "";
          findings.newEndpoints.push(`${callee.property.name.toUpperCase()} ${route}`);
        }
      }

      // WebAssembly instantiation / dangerous calls
      if (t.isMemberExpression(callee) && 
          t.isIdentifier(callee.object) && callee.object.name === "WebAssembly") {
        findings.wasmExposures.push(`WebAssembly.${callee.property.name}`);
      }
    },

    MemberExpression(path) {
      const source = path.toString(); 
      if (source.includes("wasm.memory") || 
          source.includes("instance.exports") || 
          source.includes("__WASM_INTERNAL") || 
          (source.includes("globalThis.") && source.includes("WASM"))) {
        findings.wasmExposures.push(source);
      }

      if (source.includes("process.env") && 
          (source.includes("SKIP_VERIFY") || source.includes("BYPASS") || source.includes("DISABLE_VERIFY"))) {
        findings.bypassAttempts.push(source);
      }
    },

    ThrowStatement(path) {
      const arg = path.node.argument;
      if (t.isNewExpression(arg) && t.isIdentifier(arg.callee) && (arg.callee.name === "Error" || arg.callee.name === "AIOMDivergenceError")) {
        const msg = getStringValue(arg.arguments[0]);
        if (msg) {
          findings.newFailureModes.push(msg);
        }
      }
    }
  });

  return findings;
}
