class Projectile
{
    constructor(x, y, xDes, yDes, speed, radius, player, damage = 1)
    {
        this.x = x;
        this.y = y;
        this.player = player;
        this.xDes = this.player.x;
        this.yDes = this.player.y;
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
        let distanceToDestination = Math.sqrt(Math.pow(this.x - this.xDes, 2) + Math.pow(this.y - this.yDes, 2));
        let distanceToPlayer = Math.sqrt(Math.pow(this.x - this.player.x, 2) + Math.pow(this.y - this.player.y, 2));

        if(distanceToDestination < this.radius || distanceToPlayer < this.radius + this.player.radius)
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

class Player
{
    constructor(x, y)
    {
        this.x = x;
        this.y = y;
        this.speed = 100;
        this.radius = 20;
        this.acc = {x : 0, y : 0};
        this.friction = 0.98;
    }

    draw(ctx, canvasWidth, canvasHeight)
    {
        ctx.save();

        ctx.translate(this.x + canvasWidth / 2, this.y + canvasHeight / 2);

        ctx.fillStyle = "red";

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
    
    addForce(event)
    {
        if(event.key == "w" || event.key == "W")
        {
            this.acc.y = -1;
        }
        if(event.key == "a" || event.key == "A")
        {
            this.acc.x= -1;
        }
        if(event.key == "d" || event.key == "D")
        {   
            this.acc.x = 1;
        }
        if(event.key == "s" || event.key == "S")
        {
            this.acc.y = 1;
        }

    }

    move(deltaTime)
    {
        this.x += this.acc.x * this.speed * deltaTime;
        this.y += this.acc.y * this.speed * deltaTime;
        this.acc.x *= this.friction;
        this.acc.y *= this.friction;
    }
}
export {Projectile, Player};