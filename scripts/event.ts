// Starts or stops the Coding Night countdown, live, with no redeploy.
//
//   yarn event start 90    start a 90 minute session
//   yarn event stop        clear the clock
//   yarn event status      show what is set
import { getEventEndsAt, setEventEndsAt } from "@/lib/db/queries";

const [command, value] = process.argv.slice(2);

async function main() {
  if (command === "start") {
    const minutes = Number(value);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new Error("usage: yarn event start <minutes>");
    }
    const endsAt = new Date(Date.now() + minutes * 60_000);
    await setEventEndsAt(endsAt);
    console.log(`countdown running, ends at ${endsAt.toLocaleString()}`);
    return;
  }

  if (command === "stop") {
    await setEventEndsAt(null);
    console.log("countdown cleared");
    return;
  }

  if (command === "status") {
    const endsAt = await getEventEndsAt();
    console.log(
      endsAt
        ? `ends at ${endsAt.toLocaleString()} (${Math.round((endsAt.getTime() - Date.now()) / 60_000)} minutes left)`
        : "no countdown set",
    );
    return;
  }

  throw new Error("usage: yarn event <start <minutes>|stop|status>");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
