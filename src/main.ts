import nhttp from "@nhttp/nhttp";
import serveStatic from "@nhttp/nhttp/serve-static";
import { createCanvas, Image } from "@gfx/canvas";

interface Rectangle {
    x: number;
    y: number;
    w: number;
    h: number;
}

function areIntersecting(rect1: Rectangle, rect2: Rectangle, threshold = 0.5) {
    const r1cx = rect1.x + rect1.w / 2;
    const r2cx = rect2.x + rect2.w / 2;
    const r1cy = rect1.y + rect1.h / 2;
    const r2cy = rect2.y + rect2.h / 2;
    const dist = Math.sqrt((r2cx - r1cx) ** 2 + (r2cy - r1cy) ** 2);
    const e1 = Math.sqrt(rect1.h ** 2 + rect1.w ** 2) / 2;
    const e2 = Math.sqrt(rect2.h ** 2 + rect2.w ** 2) / 2;
    return dist < (e1 + e2) * threshold;
}

const getPieceCoords = (cw: number, ch: number, pw: number, ph: number) => {
    // Random x coordinate such that the piece fits within the canvas horizontally
    const x = Math.floor(Math.random() * (cw - pw));

    // Random y coordinate such that the piece fits within the canvas vertically
    const y = Math.floor(Math.random() * (ch - ph));

    return { x, y };
};

async function generateCaptcha(from: string, opts: {
    pw: number;
    ph: number;
    cw: number;
    ch: number;
}) {
    const { pw, ph, cw, ch } = opts;
    const canvas = createCanvas(cw, ch);
    const ctx = canvas.getContext("2d");
    const image = await Image.load(from);
    if (image.width !== image.height) {
        throw new Error("A square image is required for the captcha.");
    }
    ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, cw, ch);
    const piece = createCanvas(pw, ph);
    const pctx = piece.getContext("2d");
    const coords = getPieceCoords(canvas.width, canvas.height, pw, ph);
    pctx.drawImage(canvas, coords.x, coords.y, pw, ph, 0, 0, pw, ph);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(coords.x, coords.y, pw, ph);

    return {
        puzzle: canvas.encode(),
        piece: piece.encode(),
        solution: {
            ...coords,
            w: pw,
            h: ph,
        },
    };
}

const app = nhttp();
app.use(serveStatic("./public"));

app.listen(8000);

app.post("/captcha/:uuid/check", ({ params, response, body }) => {
    if (
        !params.uuid || !body.x || !body.y || !captchas.has(params.uuid) ||
        isNaN(+body.x) || isNaN(+body.y)
    ) {
        return response.status(400).send({
            error: "bad-request",
        });
    }

    const rx = +body.x;
    const ry = +body.y;

    const { x, y, w, h } = captchas.get(params.uuid)!.solution;

    console.log({ rx, ry, x, y, w, h })

    return {
        success: areIntersecting({
            x, y, w, h
        }, {
            x: rx, y: ry, w, h
        }),
    };
});

const captchas = new Map<string, Awaited<ReturnType<typeof generateCaptcha>>>();

app.get("/captcha", async () => {
    const uuid = crypto.randomUUID();
    const captcha = await generateCaptcha("./public/house.png", {
        cw: 300,
        ch: 300,
        pw: 50,
        ph: 50,
    });
    captchas.set(uuid, captcha);
    return {
        uuid,
        piece: `/captcha/${uuid}/piece.png`,
        puzzle: `/captcha/${uuid}/puzzle.png`,
    };
});

app.get(`/captcha/:uuid/:which.png`, ({ params, response }) => {
    if (!params.which || !params.uuid) {
        return response.status(400).send("Error: missing params");
    }
    const captcha = captchas.get(params.uuid);
    if (!captcha) {
        return response.status(400).send("Error: no such captcha");
    }
    if (params.which === "piece") {
        return response.type("image/png").send(captcha.piece);
    } else if (params.which === "puzzle") {
        return response.type("image/png").send(captcha.puzzle);
    }

    return response.status(400).send("Error: Bad request.");
});
