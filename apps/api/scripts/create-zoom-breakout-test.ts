/**
Zoom ブレイクアウトルーム検証スクリプト

Usage:

# 同じ時間帯に2つのブレイクアウトルーム
pnpm dlx tsx scripts/create-zoom-breakout-test.ts same-time \
  --room1-consultant miyasan.dev@gmail.com \
  --room1-customer crzbe35290@yahoo.co.jp \
  --room2-consultant miyasan.dev@gmail.com \
  --room2-customer ms.0301@icloud.com \
  --date 2026-04-01

# 違う時間帯に2つのブレイクアウトルーム
pnpm dlx tsx scripts/create-zoom-breakout-test.ts different-time \
  --room1-consultant miyasan.dev@gmail.com \
  --room1-customer crzbe35290@yahoo.co.jp \
  --room1-hour 10 \
  --room2-consultant miyasan.dev@gmail.com \
  --room2-customer ms.0301@icloud.com \
  --room2-hour 14 \
  --date 2026-04-01
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--") && i + 1 < argv.length) {
      const key = arg.slice(2);
      args[key] = argv[++i];
    }
  }
  return args;
}

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function getAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID as string;
  const customerId = process.env.ZOOM_CLIENT_ID as string;
  const customerSecret = process.env.ZOOM_CLIENT_SECRET as string;
  const credentials = Buffer.from(`${customerId}:${customerSecret}`).toString(
    "base64",
  );

  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Zoom OAuth failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function createMeeting(params: {
  token: string;
  topic: string;
  startTime: string;
  duration: number;
  breakoutRooms: Array<{ name: string; participants: string[] }>;
}): Promise<{ meetingId: string; joinUrl: string }> {
  const hostUserId = process.env.ZOOM_HOST_USER_ID as string;

  const response = await fetch(
    `https://api.zoom.us/v2/users/${hostUserId}/meetings`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: params.topic,
        type: 2,
        start_time: params.startTime,
        duration: params.duration,
        timezone: "Asia/Tokyo",
        settings: {
          breakout_room: {
            enable: true,
            rooms: params.breakoutRooms.map((room) => ({
              name: room.name,
              participants: room.participants,
            })),
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Zoom meeting creation failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as { id: number; join_url: string };
  return { meetingId: String(data.id), joinUrl: data.join_url };
}

function printMeeting(
  meeting: { meetingId: string; joinUrl: string },
  topic: string,
  rooms: Array<{ name: string; participants: string[] }>,
) {
  console.log(`\n✅ Meeting created`);
  console.log(`  Topic: ${topic}`);
  console.log(`  Meeting ID: ${meeting.meetingId}`);
  console.log(`  Join URL: ${meeting.joinUrl}`);
  console.log(`  Breakout Rooms:`);
  for (const room of rooms) {
    console.log(`    ${room.name}: ${room.participants.join(", ")}`);
  }
}

async function sameTime(argv: string[]) {
  const args = parseArgs(argv);
  const room1Consultant = args["room1-consultant"];
  const room1Customer = args["room1-customer"];
  const room2Consultant = args["room2-consultant"];
  const room2Customer = args["room2-customer"];
  const date = args.date || getTomorrowDate();

  if (
    !room1Consultant ||
    !room1Customer ||
    !room2Consultant ||
    !room2Customer
  ) {
    console.error(
      "Usage: same-time --room1-consultant <email> --room1-customer <email> --room2-consultant <email> --room2-customer <email> [--date YYYY-MM-DD]",
    );
    process.exit(1);
  }

  const token = await getAccessToken();

  const rooms = [
    { name: "Room 1", participants: [room1Consultant, room1Customer] },
    { name: "Room 2", participants: [room2Consultant, room2Customer] },
  ];

  const topic = `みらい予報 ブレイクアウトテスト (same-time) ${date}`;

  const meeting = await createMeeting({
    token,
    topic,
    startTime: `${date}T09:00:00`,
    duration: 480,
    breakoutRooms: rooms,
  });

  printMeeting(meeting, topic, rooms);
}

async function differentTime(argv: string[]) {
  const args = parseArgs(argv);
  const room1Consultant = args["room1-consultant"];
  const room1Customer = args["room1-customer"];
  const room1Hour = args["room1-hour"] || "10";
  const room2Consultant = args["room2-consultant"];
  const room2Customer = args["room2-customer"];
  const room2Hour = args["room2-hour"] || "14";
  const date = args.date || getTomorrowDate();

  if (
    !room1Consultant ||
    !room1Customer ||
    !room2Consultant ||
    !room2Customer
  ) {
    console.error(
      "Usage: different-time --room1-consultant <email> --room1-customer <email> [--room1-hour 10] --room2-consultant <email> --room2-customer <email> [--room2-hour 14] [--date YYYY-MM-DD]",
    );
    process.exit(1);
  }

  const token = await getAccessToken();

  const h1 = room1Hour.padStart(2, "0");
  const h2 = room2Hour.padStart(2, "0");

  const rooms1 = [
    { name: "Room 1", participants: [room1Consultant, room1Customer] },
  ];
  const topic1 = `みらい予報 ブレイクアウトテスト (different-time Room1 ${h1}:00) ${date}`;

  const meeting1 = await createMeeting({
    token,
    topic: topic1,
    startTime: `${date}T${h1}:00:00`,
    duration: 60,
    breakoutRooms: rooms1,
  });

  printMeeting(meeting1, topic1, rooms1);

  const rooms2 = [
    { name: "Room 2", participants: [room2Consultant, room2Customer] },
  ];
  const topic2 = `みらい予報 ブレイクアウトテスト (different-time Room2 ${h2}:00) ${date}`;

  const meeting2 = await createMeeting({
    token,
    topic: topic2,
    startTime: `${date}T${h2}:00:00`,
    duration: 60,
    breakoutRooms: rooms2,
  });

  printMeeting(meeting2, topic2, rooms2);
}

async function main() {
  const [subcommand, ...rest] = process.argv.slice(2);

  if (subcommand === "same-time") {
    await sameTime(rest);
  } else if (subcommand === "different-time") {
    await differentTime(rest);
  } else {
    console.error(
      "Usage: create-zoom-breakout-test.ts <same-time|different-time> [options]",
    );
    console.error("");
    console.error("Subcommands:");
    console.error(
      "  same-time       2つのブレイクアウトルームを同じ時間帯で作成",
    );
    console.error(
      "  different-time  2つのブレイクアウトルームを異なる時間帯で作成",
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
