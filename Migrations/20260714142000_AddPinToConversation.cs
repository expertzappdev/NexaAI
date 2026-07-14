using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIChatBot.Migrations
{
    /// <inheritdoc />
    public partial class AddPinToConversation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPinned",
                table: "Conversations",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PinnedAt",
                table: "Conversations",
                type: "datetime(6)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPinned",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "PinnedAt",
                table: "Conversations");
        }
    }
}
