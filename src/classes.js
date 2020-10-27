class Projectile
{
    constructor(x, y, xDes, yDes, speed, radius, deathTime, player, colorString, damage = 1)
    {
        // Projectile position
        this.x = x;
        this.y = y;
        // Player ref
        this.player = player;
        // Initial destination position
        this.xDes = this.player.x;
        this.yDes = this.player.y;
        // Hit point
        this.damage = damage;
        // Speed and radius based on frequency data
        this.speed = Math.pow(speed, 2) * 100 + 50;
        this.radius = Math.pow(radius, 2) * 5 + 5;
        // Destroy tag
        this.destroy = false;
        let distance = Math.sqrt(Math.pow(this.x - this.xDes, 2) + Math.pow(this.y - this.yDes, 2));    // Distance to initial destination
        this.acc = {x : (this.xDes - this.x) / distance, y : (this.yDes - this.y) / distance};  // Acceleration
        this.homingAccMultiplier = 0.5; // Multiplier for acceleration towards player
        this.timer = 0; 
        this.deathTime = deathTime * 2 + 2;
        this.colorString = colorString;
    }

    draw(ctx, canvasWidth, canvasHeight, params={}, img)
    {
        ctx.save();

        ctx.translate(Math.floor(this.x + canvasWidth / 2), Math.floor(this.y + canvasHeight / 2));

        ctx.fillStyle = this.colorString;
        ctx.lineWidth = 0.5;

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.closePath();

        if(!params.emilMode)
        {
            ctx.fill();
        }
        else
        {
            ctx.drawImage(img, -this.radius , -this.radius , this.radius * 2, this.radius * 2);
        }
        ctx.stroke();

        ctx.restore();
    }

    collision(scoreRef)
    {
        let distanceToDestination = Math.sqrt(Math.pow(this.x - this.xDes, 2) + Math.pow(this.y - this.yDes, 2));
        let distanceToPlayer = Math.sqrt(Math.pow(this.x - this.player.x, 2) + Math.pow(this.y - this.player.y, 2));

        // Destroy when reaching initial destination or run out of time
        // Increase player point
        if(distanceToDestination < this.radius || this.timer > this.deathTime)
        {
            this.destroy = true;
            scoreRef.score += 10;
            return;
        }

        // Destroy when hitting player
        if(distanceToPlayer < this.radius + this.player.radius)
        {
            this.destroy = true;
        }
    }

    move(deltaTime)
    {
        this.timer += deltaTime;

        // Apply acceleration
        this.x += this.acc.x * this.speed * deltaTime;
        this.y += this.acc.y * this.speed * deltaTime;

        // Slightly home projectiles on player
        let distancePlayer = Math.sqrt(Math.pow(this.x - this.player.x, 2) + Math.pow(this.y - this.player.y, 2));
        this.acc.x += ((this.player.x - this.x) / distancePlayer) * this.homingAccMultiplier * deltaTime;
        this.acc.y += ((this.player.y - this.y) / distancePlayer) * this.homingAccMultiplier * deltaTime;
    }
}

class Player
{
    constructor(x, y)
    {
        this.x = x;
        this.y = y;
        this.speed = 200;
        this.radius = 15;
        this.acc = {x : 0, y : 0};
        this.friction = 0.98;
        this.keyMap = {};   // Data on keydown
        this.radiusLimit = 200;

        // Shadow info to draw
        this.shadowOffset = 3;
        this.shadowOpacity = 0.4;
        this.addForceTimer = 0;
    }

    draw(ctx, canvasWidth, canvasHeight)
    {
        ctx.save();

        ctx.translate(Math.floor(this.x + canvasWidth / 2), Math.floor(this.y + canvasHeight / 2));
        
        // Shadow
        ctx.fillStyle = `rgba(129, 127, 104, ${this.shadowOpacity})`;

        ctx.beginPath();
        let distance = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
        let vectorFromCenterX = this.x / distance;
        let vectorFromCenterY = this.y / distance;
        ctx.arc(vectorFromCenterX * this.shadowOffset,vectorFromCenterY * this.shadowOffset, this.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        // Main circle
        ctx.fillStyle = "rgb(213, 211, 190)";
        ctx.strokeStyle = `rgba(129, 127, 104, ${this.shadowOpacity})`;

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
    
    addForce(event)
    {
        // Disable movement briefly after hitting barrier
        if(this.addForceTimer > 0)
        {
            return;
        }

        // Setting keys to keydown
        if(event.key == "w" || event.key == "W")
        {
            this.keyMap["w"] = event.type == 'keydown';
        }
        if(event.key == "a" || event.key == "A")
        {
            this.keyMap["a"] = event.type == 'keydown';
        }
        if(event.key == "d" || event.key == "D")
        {   
            this.keyMap["d"] = event.type == 'keydown';
        }
        if(event.key == "s" || event.key == "S")
        {
            this.keyMap["s"] = event.type == 'keydown';
        }

    }

    move(deltaTime)
    {
        this.addForceTimer -= deltaTime;

        // Change acceleration
        for(let k in this.keyMap)
        {
            if(this.keyMap[k])
            {
                switch(k)
                {
                    case "w":
                        this.acc.y = -1;
                        break;
                    case "d":
                        this.acc.x = 1;
                        break;
                    case "s":
                        this.acc.y = 1;
                        break;
                    case "a":
                        this.acc.x = -1;
                        break;
                }
            }
        }

        // Apply acceleration
        let altX = this.x;
        let altY = this.y;
        this.x += this.acc.x * this.speed * deltaTime;
        this.y += this.acc.y * this.speed * deltaTime;

        // Clamp position
        let distance = Math.sqrt(this.x * this.x + this.y * this.y);
        if(distance >= this.radiusLimit)
        {
            this.x = altX;
            this.y = altY;

            // Vector to center
            let vectorX = -this.x / distance;
            let vectorY = -this.y / distance;

            this.acc.x = vectorX;
            this.acc.y = vectorY;

            // Stop player from sticking to edge of barrier
            for(let k in this.keyMap)
            {
                this.keyMap[k] = false;
                this.addForceTimer = 0.1;
            }
        }

        // Apply friction
        this.acc.x *= this.friction;
        this.acc.y *= this.friction;
    }
}
export {Projectile, Player};