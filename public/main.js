///<reference lib="dom">

const loadImage = (path) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = path;
        img.onload = () => resolve(img);
        img.error = (e) => reject(e);
    })
}

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: Math.round(evt.clientX - rect.left),
        y: Math.round(evt.clientY - rect.top)
    };
}

globalThis.addEventListener("DOMContentLoaded", async () => {
    const canvas = document.querySelector("#canvas");

    const mouse = {
        down: false,
        pos: {
            x: 25,
            y: 125
        }
    }

    canvas.addEventListener('mousemove', (evt) => mouse.pos = getMousePos(canvas, evt));

    canvas.addEventListener('mousedown', () => mouse.down = true);
    globalThis.addEventListener('mouseup', () => mouse.down = false);
    globalThis.onblur = () => mouse.down = false;


    const ctx = canvas.getContext('2d');
    const captcha = await fetch('/captcha').then(res => res.json()).catch(alert);
    const puzzleImg = await loadImage(captcha.puzzle);
    const pieceImg = await loadImage(captcha.piece);

    const piecePos = {
        x: mouse.pos.x,
        y: mouse.pos.y
    };

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(puzzleImg, 100, 0);

        if (mouse.down) {
            piecePos.x = mouse.pos.x - pieceImg.width / 2;
            piecePos.y = mouse.pos.y - pieceImg.height / 2;
        }

        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = 10;
        ctx.strokeRect(piecePos.x, piecePos.y, pieceImg.width, pieceImg.height);
        ctx.drawImage(pieceImg, piecePos.x, piecePos.y);
        globalThis.requestAnimationFrame(draw);
    }

    const check = document.querySelector("#check-btn");
    check.onclick = async () => {
        console.log(piecePos);
        const result = await fetch(`/captcha/${captcha.uuid}/check`, {
            method: "POST",
            body: JSON.stringify({
                x: piecePos.x - 100,
                y: piecePos.y
            })
        }).then(res => res.json()).catch(alert);
        // alert(result.success ? "Congrats!" : "Try again, loser.");
        console.log(result);
    }

    globalThis.requestAnimationFrame(draw);
})