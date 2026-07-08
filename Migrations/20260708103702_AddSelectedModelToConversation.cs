using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIChatBot.Migrations
{
    /// <inheritdoc />
    public partial class AddSelectedModelToConversation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SelectedModel",
                table: "Conversations",
                type: "varchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "llama-3.1-8b-instant")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SelectedModel",
                table: "Conversations");
        }
    }
}
