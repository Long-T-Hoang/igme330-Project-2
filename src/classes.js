class Projectile
{
    constructor(x, y, xDes, yDes, speed, radius, damage = 1)
    {
        this.x = x;
        this.y = y;
        this.xDes = xDes;
        this.yDes = yDes;
        this.damage = damage;
        this.speed = 200;
        this.radius = radius * 10;
        this.destroy = false;
    }

    draw(ctx, canvasWidth, canvasHeight)
    {
        ctx.save();

        ctx.translate(this.x + canvasWidth / 2, this.y + canvasHeight / 2);

        ctx.fillStyle = "black";

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    collision()
    {
        let distance = Math.sqrt(Math.pow(this.x - this.xDes, 2) + Math.pow(this.y - this.yDes, 2));

        if(distance < this.radius)
        {
            this.destroy = true;
        }
    }

    move(deltaTime)
    {
        let distance = Math.sqrt(Math.pow(this.x - this.xDes, 2) + Math.pow(this.y - this.yDes, 2));

        this.x += ((this.xDes - this.x) / distance) * this.speed * deltaTime;
        this.y += ((this.yDes - this.y) / distance) * this.speed * deltaTime;
    }
}

export {Projectile};