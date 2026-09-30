const url = "http://localhost:3000/gates/new";
try {
  const response = await fetch(url);
  if (!response.ok) throw new Error("App unavailable");
} catch {
  console.error(
    "Start npm run dev first. Then run npm run deploy:preprod again.",
  );
  process.exit(1);
}
console.log(`Preprod browser deployment: ${url}`);
console.log(
  "Open this URL in the browser with Lace installed. Create the gate, connect your funded Preprod wallet, and choose Publish gate on Midnight.",
);
console.log(
  "This command prepares the browser workflow. It does not deploy a contract by itself. The final wallet authorization is yours.",
);
console.log(
  "After confirmation, copy the contract address from View deployment details and paste it back into the chat for README verification.",
);
