using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIChatBot.Migrations
{
    /// <inheritdoc />
    public partial class AddIsStoppedToMessage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsStopped",
                table: "Messages",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsStopped",
                table: "Messages");
        }
    }
}
