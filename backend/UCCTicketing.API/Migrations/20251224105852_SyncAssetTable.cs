using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UCCTicketing.API.Migrations
{
    /// <inheritdoc />
    public partial class SyncAssetTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "MacAddress",
                table: "Assets",
                newName: "MAC");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "MAC",
                table: "Assets",
                newName: "MacAddress");
        }
    }
}
